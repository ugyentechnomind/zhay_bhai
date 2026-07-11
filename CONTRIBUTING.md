# Contributing

## Workflow

1. Branch off `main`: `git checkout -b <you>/<short-description>`.
2. Keep PRs scoped to one module or feature where possible - see
   [MODULES.md](./MODULES.md) for the natural seams in this codebase.
3. Before opening a PR:
   ```bash
   pnpm build
   pnpm lint
   ```
4. Open a PR against `main`. Fill in what changed and how you tested it. Link
   the issue it closes, if any.
5. At least one other person should review before merging - especially for
   anything touching `apps/web/src/lib/google.ts` or `excuseService.ts`
   (Gmail send / OAuth token handling) or the Supabase RLS policies in
   `supabase/migrations/`, since bugs there are either a security issue or a
   "sent the wrong email to the wrong person" issue.

## Project conventions

- TypeScript everywhere, strict mode on.
- Shared types go in `packages/shared/src/types.ts` - if both the web app and
  the extension need a shape, it belongs there, not duplicated in both.
- Server-only code (anything touching `SUPABASE_SERVICE_ROLE_KEY`,
  `ANTHROPIC_API_KEY`, or `googleapis`) must stay under `apps/web/src/lib/` or
  `apps/web/src/app/api/` - never imported from a client component or the
  extension, or the secret ends up in a browser bundle.
- No comments explaining *what* code does - name things clearly instead. A
  comment is for a non-obvious *why* (a workaround, a fragile assumption, a
  constraint from an external API).

## Adding a teammate's module

If you're bolting on a new capability (a new tone, a new calendar provider, a
new place to inject the Bunk button, etc.), check [MODULES.md](./MODULES.md)
first - it lists the intended extension points so new work doesn't fight the
existing structure.
