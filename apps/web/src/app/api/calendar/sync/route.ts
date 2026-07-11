import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/requestUser";
import { NotConnectedError, syncCalendarForUser } from "@/lib/excuseService";

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const events = await syncCalendarForUser(userId);
    return NextResponse.json({ events });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("calendar sync failed", err);
    return NextResponse.json({ error: "Failed to sync calendar" }, { status: 500 });
  }
}
