import { SignInButton } from "@/components/auth/sign-in-button";
import { hasSupabaseEnv } from "@/lib/env";

export default function LoginPage() {
  const envReady = hasSupabaseEnv();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700">
          Allied
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          Product directory sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sign in with your Microsoft work account to access the internal product
          directory.
        </p>

        <div className="mt-8">
          {envReady ? (
            <SignInButton />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Add the Supabase environment values in `.env.local` before sign in
              can be enabled.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
