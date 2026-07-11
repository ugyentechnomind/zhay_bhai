import { NextResponse } from "next/server";
import type { GenerateExcuseRequest, GenerateExcuseResponse } from "@zhay-bhai/shared";
import { resolveRequestUserId } from "@/lib/requestUser";
import { createExcuseForEvent } from "@/lib/excuseService";

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<GenerateExcuseRequest>;
  if (!body.eventId || !body.tone) {
    return NextResponse.json({ error: "eventId and tone are required" }, { status: 400 });
  }

  try {
    const excuse = await createExcuseForEvent(userId, body.eventId, body.tone);
    const response: GenerateExcuseResponse = {
      excuseId: excuse.id,
      subject: excuse.subject,
      body: excuse.body,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("excuse generation failed", err);
    return NextResponse.json({ error: "Failed to generate excuse" }, { status: 500 });
  }
}
