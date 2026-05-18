"use client";

import { useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

const demoUsers = [
  { label: "Attendee", email: "attendee@example.com" },
  { label: "Bartender", email: "bartender@example.com" },
  { label: "Organizer", email: "organizer@example.com" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("attendee@example.com");
  const [password, setPassword] = useState("password123");
  const [message, setMessage] = useState("Sign in to continue to your role workspace.");
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setIsLoading(true);
    setMessage("Signing in...");

    try {
      if (!hasSupabaseEnv()) {
        setMessage("Supabase env is not configured yet.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session?.access_token) {
        setMessage(error?.message ?? "Could not create a Supabase session.");
        return;
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not create app session.");
        return;
      }

      const requestedNext = searchParams.get("next");
      const roleRoot = `/${payload.redirectTo.split("/")[1]}`;
      router.replace(requestedNext?.startsWith(roleRoot) ? requestedNext : payload.redirectTo);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Event Wallet</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Each user opens only the attendee, bartender, or organizer area assigned to their account.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {demoUsers.map((user) => (
          <button
            key={user.email}
            type="button"
            onClick={() => {
              setEmail(user.email);
              setPassword("password123");
            }}
            className="rounded-md bg-slate-100 px-2 py-2 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-800"
          >
            {user.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium">
          Email
          <span className="mt-1 flex items-center gap-2 rounded-md border border-slate-300 px-3">
            <Mail size={18} className="text-slate-500" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 min-w-0 flex-1 outline-none" />
          </span>
        </label>
        <label className="block text-sm font-medium">
          Password
          <span className="mt-1 flex items-center gap-2 rounded-md border border-slate-300 px-3">
            <LockKeyhole size={18} className="text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 outline-none"
            />
          </span>
        </label>
        <button
          onClick={signIn}
          disabled={isLoading}
          className="h-12 w-full rounded-md bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Signing In" : "Sign In"}
        </button>
      </div>
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{message}</p>
    </section>
  );
}
