import { NextResponse } from "next/server";
import type { SendExcuseRequest, SendExcuseResponse } from "@zhay-bhai/shared";
import { resolveRequestUserId } from "@/lib/requestUser";
import { NotConnectedError, sendExcuse } from "@/lib/excuseService";

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<SendExcuseRequest>;
  if (!body.excuseId) {
    return NextResponse.json({ error: "excuseId is required" }, { status: 400 });
  }

  try {
    const sentAt = await sendExcuse(userId, body.excuseId, {
      subject: body.subject,
      body: body.body,
    });
    const response: SendExcuseResponse = { sent: true, sentAt };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("excuse send failed", err);
    const message = err instanceof Error ? err.message : "Failed to send excuse";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
