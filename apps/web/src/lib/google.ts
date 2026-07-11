import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

export { GOOGLE_SCOPES } from "@zhay-bhai/shared";

/** Builds an OAuth2 client hydrated with a user's stored Google tokens. */
export async function getGoogleClientForUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: data.refresh_token,
    access_token: data.access_token ?? undefined,
    expiry_date: data.access_token_expires_at
      ? new Date(data.access_token_expires_at).getTime()
      : undefined,
  });

  // Persist a refreshed access token so we don't hit the token endpoint on
  // every call.
  oauth2Client.on("tokens", async (tokens) => {
    if (!tokens.access_token) return;
    await admin
      .from("connected_accounts")
      .update({
        access_token: tokens.access_token,
        access_token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  });

  return { oauth2Client, googleEmail: data.google_email as string };
}

/** Fetches calendar events in a window around "now" (default: -5 to +5 days). */
export async function fetchCalendarWindow(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  { daysBefore = 5, daysAfter = 5 }: { daysBefore?: number; daysAfter?: number } = {},
) {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - daysBefore);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + daysAfter);

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return data.items ?? [];
}

/** Sends a plain-text email via Gmail as the connected user. */
export async function sendGmail(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  { to, subject, body }: { to: string; subject: string; body: string },
) {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const messageLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body,
  ];
  const raw = Buffer.from(messageLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
