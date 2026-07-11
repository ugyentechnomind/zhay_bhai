import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_PREFIX = "bunk_";

export function generateExtensionToken() {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Resolves the bearer token sent by the extension to a user id, if valid. */
export async function resolveExtensionToken(bearerToken: string | null): Promise<string | null> {
  if (!bearerToken?.startsWith(TOKEN_PREFIX)) return null;

  const admin = createAdminClient();
  const tokenHash = hashExtensionToken(bearerToken);
  const { data, error } = await admin
    .from("extension_tokens")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;

  await admin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return data.user_id as string;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}
