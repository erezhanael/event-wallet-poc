import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-4 py-8 text-slate-950">
      <Suspense
        fallback={
          <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading login...</p>
          </section>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
