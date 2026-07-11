"use client";

import { createClient } from "@/lib/supabase/client";
import { GOOGLE_SCOPES } from "@zhay-bhai/shared";

export function SignInButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: GOOGLE_SCOPES.join(" "),
        queryParams: {
          access_type: "offline",
          // Forces Google to re-show consent and re-issue a refresh token on
          // every sign-in (see src/app/auth/callback/route.ts).
          prompt: "consent",
        },
      },
    });
  }

  return (
    <button
      onClick={signIn}
      className="rounded-full bg-black text-white px-6 py-3 font-medium hover:bg-neutral-800 transition-colors"
    >
      Connect Google Calendar
    </button>
  );
}
