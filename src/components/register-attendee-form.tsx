"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function RegisterAttendeeForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Create an attendee account to continue to tickets.");
  const [isSaving, setIsSaving] = useState(false);

  async function register() {
    setIsSaving(true);
    setMessage("Creating attendee account...");

    try {
      const response = await fetch("/api/auth/register-attendee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, fullName, email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not create attendee account.");
        return;
      }

      const next = searchParams.get("next");
      router.replace(next?.startsWith("/attendee/") ? next : payload.redirectTo);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(searchParams.get("next") ?? `/attendee/events/${eventId}/tickets`)}`;

  return (
    <section className="glass-card shine mx-auto w-full max-w-md rounded-[2rem] p-5">
      <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">New attendee</p>
      <h1 className="premium-heading mt-4 text-4xl">Create Account</h1>
      <p className="mt-2 text-sm leading-6 text-white/60">Register once, then buy tickets and load your event wallet.</p>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-semibold text-white/75">
          Full name
          <span className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3">
            <UserRound size={18} className="text-cyan-200" />
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-white outline-none" />
          </span>
        </label>
        <label className="block text-sm font-semibold text-white/75">
          Email
          <span className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3">
            <Mail size={18} className="text-cyan-200" />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-white outline-none" />
          </span>
        </label>
        <label className="block text-sm font-semibold text-white/75">
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.08] px-3 text-white outline-none" />
        </label>
        <button type="button" onClick={register} disabled={isSaving} className="neon-button h-12 w-full rounded-2xl font-black disabled:opacity-50">
          {isSaving ? "Creating..." : "Continue to Tickets"}
        </button>
      </div>

      <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/[0.64]">{message}</p>
      <Link href={loginHref} className="mt-4 flex justify-center text-sm font-bold text-cyan-100 hover:text-white">
        Already have an account? Login
      </Link>
    </section>
  );
}
