import Link from "next/link";
import { CreditCard, LayoutDashboard, Martini, QrCode, Store, TicketCheck } from "lucide-react";
import { cookies } from "next/headers";
import { isUserRole } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { MotionPanel } from "./motion-primitives";
import { LogoutButton } from "./logout-button";

const nav = [
  { href: "/attendee/events", label: "Attendee", icon: QrCode, role: "attendee" },
  { href: "/bartender", label: "Bartender", icon: Martini, role: "bartender" },
  { href: "/vendor", label: "Vendor", icon: Store, role: "vendor" },
  { href: "/check-in", label: "Check-In", icon: TicketCheck, role: "checkin" },
  { href: "/organizer/dashboard", label: "Organizer", icon: LayoutDashboard, role: "organizer" },
];

function getInitials(name?: string | null) {
  if (!name) return "EW";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("event_wallet_role")?.value;
  const userId = cookieStore.get("event_wallet_user_id")?.value;
  const profile = await getProfile(userId);
  const visibleNav = isUserRole(role) ? nav.filter((item) => item.role === role) : [];
  const displayName = profile?.full_name ?? (isUserRole(role) ? role : "Guest");
  const initials = getInitials(displayName);

  return (
    <div className="nightlife-bg min-h-screen text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/35 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="grid size-9 place-items-center rounded-lg border border-emerald-300/40 bg-emerald-300/[0.15] text-emerald-200 shadow-[0_0_28px_rgba(56,255,156,0.22)]">
              <CreditCard size={18} />
            </span>
            <span>Event Wallet</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-sm font-semibold text-white/75">
              <span className="grid size-8 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.12] text-xs font-black text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,0.16)]">
                {initials}
              </span>
              <span className="max-w-32 truncate">{displayName}</span>
            </div>
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/70 hover:border-emerald-300/40 hover:bg-emerald-300/10 hover:text-white"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
        {visibleNav.length > 0 && (
          <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto border-t border-white/10 px-4 py-2 pb-3 sm:hidden">
            <div className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.10] py-1 pl-1 pr-3 text-sm font-semibold text-cyan-50">
              <span className="grid size-9 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.12] text-xs font-black text-cyan-100">
                {initials}
              </span>
              <span className="max-w-28 truncate">{displayName}</span>
            </div>
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.22)]"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
            <LogoutButton className="h-11 shrink-0 rounded-full border border-white/10 bg-white/10 text-white" />
          </nav>
        )}
      </header>
      <MotionPanel className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:pb-8">{children}</MotionPanel>
    </div>
  );
}
