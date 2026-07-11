import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";
import { GOOGLE_SESSION_STORAGE_KEY } from "@/lib/googleSession";

/**
 * There is no server-side session in this app - the browser is the only
 * place credentials live. This route exchanges the OAuth `code` for a
 * refresh token, then hands it to the browser via a tiny inline script that
 * writes it to localStorage before redirecting home.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent("Missing OAuth code")}`);
  }

  try {
    const { refreshToken, email } = await exchangeCodeForTokens(origin, code);
    const payload = JSON.stringify({ refreshToken, email });

    const html = `<!doctype html>
<html>
  <body>
    <p>Connecting&hellip;</p>
    <script>
      localStorage.setItem(${JSON.stringify(GOOGLE_SESSION_STORAGE_KEY)}, ${JSON.stringify(payload)});
      location.replace("/");
    </script>
  </body>
</html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }
}
