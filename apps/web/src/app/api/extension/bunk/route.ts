import { NextResponse } from "next/server";
import type { ExcuseTone } from "@zhay-bhai/shared";
import { resolveRequestUserId } from "@/lib/requestUser";
import { NotConnectedError, createExcuseForEvent, sendExcuse } from "@/lib/excuseService";

interface BunkRequest {
  eventId: string;
  tone: ExcuseTone;
  /** If false, only generate + return the draft so the extension can show a preview before sending. */
  autoSend?: boolean;
}

/** One-click flow for the extension's injected "Bunk" button: generate + send. */
export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<BunkRequest>;
  if (!body.eventId || !body.tone) {
    return NextResponse.json({ error: "eventId and tone are required" }, { status: 400 });
  }

  try {
    const excuse = await createExcuseForEvent(userId, body.eventId, body.tone);

    if (body.autoSend === false) {
      return NextResponse.json({
        excuseId: excuse.id,
        subject: excuse.subject,
        body: excuse.body,
        sent: false,
      });
    }

    const sentAt = await sendExcuse(userId, excuse.id);
    return NextResponse.json({
      excuseId: excuse.id,
      subject: excuse.subject,
      body: excuse.body,
      sent: true,
      sentAt,
    });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("extension bunk failed", err);
    const message = err instanceof Error ? err.message : "Failed to bunk meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
