"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LockKeyhole, Mail, QrCode, RadioTower, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

const demoUsers = [
  { label: "Attendee", email: "attendee@example.com" },
  { label: "Check-In", email: "checkin@example.com" },
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
    <section className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_430px]">
      <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="hidden lg:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/[0.10] px-3 py-2 text-sm font-semibold text-emerald-100">
          <Sparkles size={16} />
          Rooftop wallet access
        </div>
        <h1 className="premium-heading mt-6 max-w-xl text-6xl font-black leading-[0.92] text-white">
          Your Night Starts Here
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-white/[0.68]">
          Tap in, top up, scan fast, and keep the bar moving with a wallet built for neon nights.
        </p>
        <div className="mt-8 flex gap-3">
          <div className="glass-card grid size-24 place-items-center rounded-3xl scan-frame">
            <QrCode size={46} className="text-emerald-200" />
          </div>
          <div className="glass-card grid size-24 place-items-center rounded-3xl">
            <RadioTower size={42} className="text-cyan-200" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card shine w-full rounded-[2rem] p-5 shadow-2xl"
      >
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-emerald-200">Event Wallet</p>
          <h1 className="premium-heading mt-2 text-4xl font-black tracking-tight text-white lg:hidden">Your Night Starts Here</h1>
          <h2 className="premium-heading mt-2 hidden text-3xl font-black tracking-tight text-white lg:block">Login</h2>
          <p className="mt-2 text-sm leading-6 text-white/[0.62]">
            Choose your role and jump into the right event flow.
          </p>
        </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1 sm:grid-cols-4">
        {demoUsers.map((user) => (
          <button
            key={user.email}
            type="button"
            onClick={() => {
              setEmail(user.email);
              setPassword("password123");
            }}
            className={`rounded-xl px-2 py-2.5 text-xs font-bold ${email === user.email ? "neon-button" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}
          >
            {user.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-semibold text-white/[0.82]">
          Email
          <span className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 shadow-inner shadow-black/20">
            <Mail size={18} className="text-cyan-200" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/35" />
          </span>
        </label>
        <label className="block text-sm font-semibold text-white/[0.82]">
          Password
          <span className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 shadow-inner shadow-black/20">
            <LockKeyhole size={18} className="text-pink-200" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-white outline-none"
            />
          </span>
        </label>
        <button
          onClick={signIn}
          disabled={isLoading}
          className="neon-button h-12 w-full rounded-2xl font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Signing In" : "Sign In"}
        </button>
      </div>
      <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/[0.64]">{message}</p>
      <Link
        href="/"
        className="mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white/75 transition hover:bg-white/[0.12] hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to Homepage
      </Link>
      </motion.div>
    </section>
  );
}
