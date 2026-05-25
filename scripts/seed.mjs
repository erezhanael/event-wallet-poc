import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  const envFile = readFileSync(".env.local", "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    process.env[key] ??= valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "organizer@example.com", password: "password123", role: "organizer", full_name: "Maya Organizer" },
  { email: "attendee@example.com", password: "password123", role: "attendee", full_name: "Noam Attendee" },
  { email: "bartender@example.com", password: "password123", role: "bartender", full_name: "Dana Bar" },
  { email: "checkin@example.com", password: "password123", role: "checkin", full_name: "Rina Check-In" },
];

async function upsertUser(user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name, role: user.role },
  });

  if (error && error.code !== "email_exists" && !error.message.includes("already registered")) throw error;

  if (data.user) {
    await supabase.from("users_profile").upsert({
      id: data.user.id,
      role: user.role,
      full_name: user.full_name,
    });
    return data.user.id;
  }

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((candidate) => candidate.email === user.email);
  if (!existing) throw new Error(`Could not locate ${user.email}`);

  await supabase.from("users_profile").upsert({
    id: existing.id,
    role: user.role,
    full_name: user.full_name,
  });
  return existing.id;
}

const ids = {};
for (const user of users) {
  ids[user.role] = await upsertUser(user);
}

const { data: event, error: eventError } = await supabase
  .from("events")
  .upsert(
    {
      organizer_id: ids.organizer,
      name: "Neon Rooftop Friday",
      event_code: "NEON-2026",
      start_time: "2026-06-05T19:00:00.000Z",
      end_time: "2026-06-06T02:00:00.000Z",
      currency: "ILS",
    },
    { onConflict: "event_code" },
  )
  .select()
  .single();
if (eventError) throw eventError;

await supabase.from("event_members").upsert(
  [
    { event_id: event.id, user_id: ids.organizer, role: "organizer" },
    { event_id: event.id, user_id: ids.attendee, role: "attendee" },
    { event_id: event.id, user_id: ids.bartender, role: "bartender" },
    { event_id: event.id, user_id: ids.checkin, role: "checkin" },
  ],
  { onConflict: "event_id,user_id" },
);

const { data: wallet, error: walletError } = await supabase
  .from("wallets")
  .upsert(
    {
      event_id: event.id,
      user_id: ids.attendee,
      balance_cents: 8500,
      qr_token: "wallet_demo_neon_2026_noam",
      status: "active",
    },
    { onConflict: "event_id,user_id" },
  )
  .select()
  .single();
if (walletError) throw walletError;

await supabase.from("menu_items").delete().eq("event_id", event.id);
await supabase.from("menu_items").insert([
  { event_id: event.id, name: "Goldstar", price_cents: 2800, category: "Beer" },
  { event_id: event.id, name: "Arak Lemonade", price_cents: 4200, category: "Cocktail" },
  { event_id: event.id, name: "Vodka Soda", price_cents: 4600, category: "Cocktail" },
  { event_id: event.id, name: "Mineral Water", price_cents: 1200, category: "Soft" },
  { event_id: event.id, name: "Energy Drink", price_cents: 1800, category: "Soft" },
  { event_id: event.id, name: "House Shot", price_cents: 2200, category: "Shot" },
]);

await supabase.from("ticket_types").delete().eq("event_id", event.id);
await supabase.from("ticket_types").insert([
  {
    event_id: event.id,
    name: "General Admission",
    description: "Rooftop entry with wallet access.",
    price_cents: 6500,
    quantity_total: 200,
  },
  {
    event_id: event.id,
    name: "VIP",
    description: "Priority entry and VIP wristband.",
    price_cents: 14000,
    quantity_total: 50,
  },
]);

await supabase.from("transactions").insert([
  {
    event_id: event.id,
    wallet_id: wallet.id,
    type: "topup",
    amount_cents: 15000,
    metadata: { seeded: true },
  },
]);

console.log("Seed complete");
console.log("Event code: NEON-2026");
console.log("Attendee: attendee@example.com / password123");
console.log("Bartender: bartender@example.com / password123");
console.log("Check-In: checkin@example.com / password123");
console.log("Organizer: organizer@example.com / password123");
