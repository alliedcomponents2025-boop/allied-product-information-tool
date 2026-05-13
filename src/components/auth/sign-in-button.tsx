"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);

    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <Button type="button" onClick={handleSignIn} disabled={isLoading}>
      {isLoading ? "Redirecting..." : "Sign in with Microsoft"}
    </Button>
  );
}
