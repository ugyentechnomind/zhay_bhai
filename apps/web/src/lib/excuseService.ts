import type { ExcuseTone } from "@zhay-bhai/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCalendarWindow, getGoogleClientForUser, sendGmail } from "@/lib/google";
import { generateExcuse } from "@/lib/anthropic";

export class NotConnectedError extends Error {
  constructor() {
    super("Google account is not connected for this user");
    this.name = "NotConnectedError";
  }
}

/** Pulls the +/- 5 day calendar window from Google and upserts it into Supabase. */
export async function syncCalendarForUser(userId: string) {
  const admin = createAdminClient();
  const googleClient = await getGoogleClientForUser(userId);
  if (!googleClient) throw new NotConnectedError();

  const events = await fetchCalendarWindow(googleClient.oauth2Client);

  const rows = events
    .filter((event) => event.id && event.start?.dateTime && event.end?.dateTime)
    .map((event) => {
      const organizer = event.organizer;
      return {
        user_id: userId,
        google_event_id: event.id!,
        title: event.summary || "(no title)",
        description: event.description ?? null,
        organizer_email: organizer?.email ?? null,
        organizer_name: organizer?.displayName ?? null,
        location: event.location ?? null,
        start_time: event.start!.dateTime!,
        end_time: event.end!.dateTime!,
        html_link: event.htmlLink ?? null,
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) return [];

  const { data, error } = await admin
    .from("calendar_events")
    .upsert(rows, { onConflict: "user_id,google_event_id" })
    .select();

  if (error) throw error;
  return data;
}

/** Generates (via Claude) and stores a decline excuse for one of the user's events. */
export async function createExcuseForEvent(userId: string, eventId: string, tone: ExcuseTone) {
  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .single();
  if (eventError) throw eventError;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();
  const senderFirstName = (profile?.full_name ?? profile?.email ?? "").split(" ")[0] || "there";

  const draft = await generateExcuse({
    eventTitle: event.title,
    organizerName: event.organizer_name,
    tone,
    senderFirstName,
  });

  const { data: excuse, error: excuseError } = await admin
    .from("excuses")
    .insert({
      user_id: userId,
      event_id: eventId,
      tone,
      subject: draft.subject,
      body: draft.body,
    })
    .select()
    .single();
  if (excuseError) throw excuseError;

  return excuse;
}

/** Sends a previously generated excuse to the event organizer via Gmail. */
export async function sendExcuse(
  userId: string,
  excuseId: string,
  overrides?: { subject?: string; body?: string },
) {
  const admin = createAdminClient();

  const { data: excuse, error: excuseError } = await admin
    .from("excuses")
    .select("*, calendar_events(*)")
    .eq("id", excuseId)
    .eq("user_id", userId)
    .single();
  if (excuseError) throw excuseError;

  const event = excuse.calendar_events as { organizer_email: string | null; id: string };
  if (!event.organizer_email) {
    throw new Error("This event has no organizer email on file - can't send an excuse.");
  }

  const googleClient = await getGoogleClientForUser(userId);
  if (!googleClient) throw new NotConnectedError();

  const subject = overrides?.subject ?? excuse.subject;
  const body = overrides?.body ?? excuse.body;

  await sendGmail(googleClient.oauth2Client, { to: event.organizer_email, subject, body });

  const sentAt = new Date().toISOString();
  await admin.from("excuses").update({ subject, body, sent_at: sentAt }).eq("id", excuseId);
  await admin.from("calendar_events").update({ status: "bunked" }).eq("id", event.id);

  return sentAt;
}
