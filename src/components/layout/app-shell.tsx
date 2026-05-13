import { ReactNode } from "react";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const envReady = hasSupabaseEnv();
  let userEmail: string | undefined;
  let userRole: string | undefined;

  if (envReady) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email;

    if (user) {
      const { data: profile } = await supabase
        .from("users_profile")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      userRole = profile?.role;
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar hasSupabaseEnv={envReady} email={userEmail} role={userRole} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
