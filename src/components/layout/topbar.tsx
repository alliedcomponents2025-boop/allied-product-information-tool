import { SignOutButton } from "@/components/auth/sign-out-button";

type TopbarProps = {
  hasSupabaseEnv: boolean;
  email?: string;
  role?: string;
};

export function Topbar({ hasSupabaseEnv, email, role }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-sm font-medium text-slate-900">Allied workspace</p>
          <p className="text-sm text-slate-500">
            {hasSupabaseEnv
              ? "Supabase environment connected"
              : "Add Supabase environment values to enable sign in"}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <div>
            <p className="font-medium text-slate-900">{email ?? "Guest user"}</p>
            <p className="text-slate-500">{role ?? "Viewer"}</p>
          </div>
          {hasSupabaseEnv && email ? <SignOutButton /> : null}
        </div>
      </div>
    </header>
  );
}
