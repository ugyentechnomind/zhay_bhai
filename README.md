# Zhay Bhai AI 🙈

Politely skip a meeting you can't make: see your calendar's ±5 day window, pick a
reason, let Claude draft a short decline email, and send it to the organizer -
either from the web dashboard or with one click via the browser extension's
"Bunk" button injected right into Google Calendar.

## How it fits together

```
apps/web/          Next.js dashboard (App Router) + all backend API routes
extension/         Chrome (Manifest V3) extension: popup, options, content script
packages/shared/    TypeScript types shared by both (Event, Excuse, tone labels)
supabase/          Postgres schema + RLS policies (migrations)
```

- **Auth & storage**: Supabase Auth (Google OAuth) + Postgres. We request the
  `calendar.readonly` and `gmail.send` scopes on top of the default sign-in, so
  the same Google grant lets us read your calendar and send mail as you.
- **Excuse generation**: `apps/web/src/lib/anthropic.ts` calls Claude to draft a
  short, believable decline email for a given event + reason ("tone").
- **Sending**: `apps/web/src/lib/google.ts` sends the drafted email via the
  Gmail API, using the same OAuth grant - so it lands in the organizer's inbox
  as coming from *you*, not a bot.
- **Extension**: talks to the web app's API using a personal access token
  (minted from the dashboard's Settings page), not cookies - see
  `apps/web/src/lib/requestUser.ts`. The content script tries to inject a
  "Bunk" button directly into Google Calendar's event popover; the popup is
  the reliable fallback (see [MODULES.md](./MODULES.md) for why the DOM
  injection is best-effort).

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in `supabase/migrations/0001_init.sql` against it (via
   the SQL editor, or the Supabase CLI: `supabase db push`).
3. In **Authentication → Providers → Google**, enable the provider and paste
   in the Google OAuth client ID/secret from step 2 below. Set the redirect
   URL shown there aside - you'll need it for the Google Cloud console.

### 2. Google Cloud OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (Web application).
2. Enable the **Google Calendar API** and **Gmail API** for the project.
3. Add Supabase's callback URL (from step 1.3) as an authorized redirect URI.
4. Copy the client ID/secret into both Supabase (step 1.3) and
   `apps/web/.env.local` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

### 3. Anthropic API key

Grab a key from the [Anthropic Console](https://console.anthropic.com) for
`ANTHROPIC_API_KEY`.

### 4. Environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID/SECRET, ANTHROPIC_API_KEY
```

### 5. Run the web app

```bash
pnpm install
pnpm dev:web   # http://localhost:3000
```

Sign in, then open **Settings** and generate an extension access token.

### 6. Load the extension

```bash
pnpm build:extension   # outputs extension/dist
```

In Chrome, go to `chrome://extensions`, enable Developer mode, "Load
unpacked", and select `extension/dist`. Open the extension's options page and
paste in the token from step 5 (and the web app's URL, if not localhost).

## Development

```bash
pnpm dev:web         # Next.js dev server
pnpm dev:extension   # Vite build --watch (reload the unpacked extension after each build)
pnpm build           # build every package
pnpm lint            # lint every package
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the collaboration workflow, and
[MODULES.md](./MODULES.md) for where to plug in new tones, providers, or
calendar sources.
