import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ExtensionTokenPanel } from "./ExtensionTokenPanel";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500">
        &larr; Back to dashboard
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold">Settings</h1>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium">Pair the browser extension</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Generate a personal access token and paste it into the extension&apos;s options page
          so it can sync your calendar and trigger &quot;Bunk&quot; on your behalf.
        </p>
        <ExtensionTokenPanel />
      </section>
    </div>
  );
}
