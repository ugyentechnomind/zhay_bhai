import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateExtensionToken, hashExtensionToken } from "@/lib/extensionAuth";

/** Web-app-only (cookie session): mints a new personal access token for the extension. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = (await request.json().catch(() => ({}))) as { name?: string };

  const token = generateExtensionToken();
  const admin = createAdminClient();
  const { error } = await admin.from("extension_tokens").insert({
    user_id: user.id,
    token_hash: hashExtensionToken(token),
    name: name || "Browser extension",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only ever returned once - the DB only stores the hash.
  return NextResponse.json({ token });
}
