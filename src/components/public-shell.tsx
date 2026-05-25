import Link from "next/link";
import { CreditCard, LogIn } from "lucide-react";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="nightlife-bg min-h-screen text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/35 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-white">
            <span className="grid size-9 place-items-center rounded-lg border border-emerald-300/40 bg-emerald-300/[0.15] text-emerald-200 shadow-[0_0_28px_rgba(56,255,156,0.22)]">
              <CreditCard size={18} />
            </span>
            <span>Event Wallet</span>
          </Link>
          <nav className="flex items-center gap-2">
            <a href="#events" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-white/65 hover:text-white sm:inline-flex">
              Events
            </a>
            <a href="#how-it-works" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-white/65 hover:text-white sm:inline-flex">
              How It Works
            </a>
            <Link href="/login" className="neon-button inline-flex h-10 items-center gap-2 px-4 text-sm">
              <LogIn size={16} />
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
