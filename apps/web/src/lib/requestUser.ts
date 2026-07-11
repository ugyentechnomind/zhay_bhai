import { createClient } from "@/lib/supabase/server";
import { extractBearerToken, resolveExtensionToken } from "@/lib/extensionAuth";

/**
 * Resolves the acting user for an API route from either the web app's
 * cookie-based Supabase session, or the browser extension's `Authorization:
 * Bearer <token>` header. Returns null if neither is present/valid.
 */
export async function resolveRequestUserId(request: Request): Promise<string | null> {
  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (bearer) {
    return resolveExtensionToken(bearer);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
