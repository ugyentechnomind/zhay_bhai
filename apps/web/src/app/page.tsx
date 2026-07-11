import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "./SignInButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-8 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Bunk It 🙈</h1>
        <p className="text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          See what&apos;s on your calendar for the next (and last) 5 days, and let an AI
          draft a polite decline email to the organizer when you just can&apos;t make it.
        </p>
        <SignInButton />
        <p className="text-xs text-zinc-400">
          We only request Calendar read access and Gmail send access - used solely
          to show your events and send excuse emails as you.
        </p>
      </main>
    </div>
  );
}
