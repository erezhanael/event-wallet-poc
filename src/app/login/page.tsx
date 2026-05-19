import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="nightlife-bg grid min-h-screen place-items-center px-4 py-8 text-white">
      <Suspense
        fallback={
          <section className="glass-card w-full max-w-md rounded-3xl p-6">
            <p className="text-sm text-white/60">Loading login...</p>
          </section>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
