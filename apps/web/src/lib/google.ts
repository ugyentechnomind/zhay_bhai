import { google } from "googleapis";

export { GOOGLE_SCOPES } from "@zhay-bhai/shared";
import { GOOGLE_SCOPES } from "@zhay-bhai/shared";

function redirectUri(origin: string) {
  return `${origin}/api/google/callback`;
}

function baseOAuthClient(origin?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    origin ? redirectUri(origin) : undefined,
  );
}

/** Builds the URL that kicks off Google's consent screen. */
export function getGoogleAuthUrl(origin: string) {
  return baseOAuthClient(origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

/** Exchanges an OAuth `code` for a refresh token + the connected email. */
export async function exchangeCodeForTokens(origin: string, code: string) {
  const client = baseOAuthClient(origin);
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "Google didn't return a refresh token. Remove Zhay Bhai AI's access at " +
        "https://myaccount.google.com/permissions and try connecting again.",
    );
  }

  client.setCredentials(tokens);
  const { data } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();

  return { refreshToken: tokens.refresh_token, email: data.email ?? "" };
}

/** Builds an OAuth2 client hydrated with a refresh token pulled from the browser. */
export function clientFromRefreshToken(refreshToken: string) {
  const client = baseOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
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
