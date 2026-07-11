import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CalendarEvent } from "@zhay-bhai/shared";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("connected_accounts")
    .select("google_email")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .order("start_time", { ascending: true });

  const mapped: CalendarEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    userId: e.user_id,
    googleEventId: e.google_event_id,
    title: e.title,
    description: e.description,
    organizerEmail: e.organizer_email,
    organizerName: e.organizer_name,
    location: e.location,
    startTime: e.start_time,
    endTime: e.end_time,
    status: e.status,
    htmlLink: e.html_link,
  }));

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      googleConnected={Boolean(connection)}
      initialEvents={mapped}
    />
  );
}
