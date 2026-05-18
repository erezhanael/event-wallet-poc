import Link from "next/link";
import { CreditCard, LayoutDashboard, Martini, QrCode } from "lucide-react";
import { cookies } from "next/headers";
import { isUserRole } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

const nav = [
  { href: "/attendee/events", label: "Attendee", icon: QrCode, role: "attendee" },
  { href: "/bartender", label: "Bartender", icon: Martini, role: "bartender" },
  { href: "/organizer/dashboard", label: "Organizer", icon: LayoutDashboard, role: "organizer" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("event_wallet_role")?.value;
  const visibleNav = isUserRole(role) ? nav.filter((item) => item.role === role) : [];

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-white">
              <CreditCard size={18} />
            </span>
            Event Wallet
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
