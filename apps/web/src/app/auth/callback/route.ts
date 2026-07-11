import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GOOGLE_SCOPES } from "@/lib/google";

/**
 * Supabase OAuth redirect target. Exchanges the auth code for a session and,
 * since we request the calendar.readonly + gmail.send scopes with
 * `prompt=consent&access_type=offline` (see the sign-in button), Google hands
 * back a fresh refresh token on every login - so we just upsert it here.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const { session, user } = data;

  if (session.provider_token) {
    const admin = createAdminClient();
    if (session.provider_refresh_token) {
      await admin.from("connected_accounts").upsert({
        user_id: user.id,
        google_email: user.email ?? "",
        refresh_token: session.provider_refresh_token,
        access_token: session.provider_token,
        access_token_expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        scopes: GOOGLE_SCOPES,
        updated_at: new Date().toISOString(),
      });
    } else {
      // No new refresh token issued this round - just keep the access token fresh.
      await admin
        .from("connected_accounts")
        .update({
          access_token: session.provider_token,
          access_token_expires_at: session.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
