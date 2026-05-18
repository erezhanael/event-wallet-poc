"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    if (hasSupabaseEnv()) {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    }

    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 ${className}`}
    >
      <LogOut size={16} />
      Logout
    </button>
  );
}
