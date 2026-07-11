import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/requestUser";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotConnectedError, syncCalendarForUser } from "@/lib/excuseService";

/** Used by the browser extension popup: re-syncs then returns the +/- 5 day window. */
export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await syncCalendarForUser(userId);
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("extension events sync failed", err);
    // Fall through and serve whatever is already cached in the DB.
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}
