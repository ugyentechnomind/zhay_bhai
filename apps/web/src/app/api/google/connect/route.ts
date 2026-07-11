import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(getGoogleAuthUrl(origin));
}
