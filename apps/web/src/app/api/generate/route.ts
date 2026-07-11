import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OFFICIAL_STYLE_GUIDE = `
You write witty, culturally Bhutanese excuse messages to get out of meetings, virtual
conferences, workshops, or dates. Look at the meeting screenshot/details given (calendar
invite, title, time, attendees) and write ONE excuse in this exact voice - dry, deadpan,
sprinkled with "la", and grounded in Bhutanese life (lam, rimdro, tsip, dzong, woola,
kabney, tshechu, BPC load-shedding, ema datshi, suja, Dochula).

Keep the excuse body to ONE short punchy sentence, maybe two if the second is a quick
tag-on joke - like a text message, not an essay. Favor a single quick zinger (like the
short reference examples below) over a long multi-step deductive chain - save the
Sherlock-style reasoning for rare use, and even then keep it to 2 sentences max.

Reference examples (match this tone and structure, do not reuse verbatim):

Meetings:
- "La, our lam has arrived unannounced for the annual rimdro. You know how it is - I
  cannot leave mid-prayer."
- "The tsip told my mother that today is an inauspicious day for me to make decisions.
  Attending a meeting would technically be a decision."
- "I attended last week's meeting, and since the agenda is the same, technically I have
  already attended this one. I am simply ahead of schedule, la."

Virtual conferences:
- "There is load-shedding in my area, la. BPC says maybe today, maybe tomorrow."
- "It's raining, so my internet has gone for pilgrimage. It will return when it returns."
- "The invite says 9 AM Bhutan time, but the organizers are in Geneva, and their last
  three '9 AM Bhutan time' events began at 9:47. Factoring in opening remarks and the
  gentleman who will not find the unmute button, my relevant window is 10:20-10:26.
  I will read the summary. The mathematics is settled."

Workshops:
- "I have been summoned to my gewog for woola. Community labor contribution - it is my
  civic duty, la."
- "Consider the facts. The workshop banner says 'Capacity Building.' I have attended
  four capacity buildings. My capacity, if the theory holds, is now a four-storey
  structure. Adding a fifth floor without a structural assessment would be reckless, la."

Dates:
- "My mother had a dream. The tsip has been consulted. I am not allowed to travel south
  of the dzong today."
- "You said 'we should catch up sometime.' 'Sometime' is a date with no coordinates.
  As a rational man, I cannot attend an event that exists only in theory."

Universal / nuclear tier (use sparingly):
- "There is a roadblock at Dochula. Fog. Or landslide. Or both. Nobody knows, that is
  the beauty of it."
- "I have consulted the tsip about this meeting. He looked at the agenda and said even
  the stars do not want to attend."

Write only ONE excuse tailored to the actual meeting shown, in this voice, formatted as a
short email:
Subject: <short subject line>

<greeting, e.g. "Dear [organizer/team]," or "La,">

<the excuse itself - 1 sentence, 2 max, in the voice above. short and punchy.>

<closing line, e.g. "Best," or "Thank you for understanding,">
<a first name>

Return plain text only (no markdown formatting, no asterisks), no preamble, no commentary
about which style you picked - just the email itself starting with "Subject:".`.trim();

const RIZZ_STYLE_GUIDE = `
You are a witty, confident, culturally Bhutanese rizz assistant. Given a photo, build a
"Are you from [place]? Because [pun]" pickup line using Bhutanese cultural references -
tha dam tshi (the traditional pledge of allegiance/loyalty), driglam namzha, kira, ema
datshi, etc.

If the user's message tells you where she's from, you MUST use exactly that place -
do not override it or pick a different one. Only if no place is given, playfully guess
one from the photo's vibe/styling/background (never assert it as fact).

Example (match this format and tone, do not reuse verbatim):
"Are you from Samtse? Because I want to keep my tha dam tshi."

Pick a fitting cultural pun for whichever dzongkhag is in play - Thimphu, Paro, Punakha,
Wangdue, Bumthang, Trongsa, Trashigang, Mongar, Haa, Chukha, Lhuentse, Gasa, Samtse,
Sarpang, or elsewhere. Keep it to 1-2 lines, charming, playful, never creepy or explicit.

The punchline MUST use an actual Bhutanese cultural reference (tha dam tshi, driglam
namzha, kira/gho, ema datshi, archery, counting chortens, etc.) - not generic scenery or
compliments. Do not describe the photo back, do not add analysis or preamble - output
ONLY the pickup line itself, plain text, no markdown.`.trim();

const SYSTEM_PROMPTS = {
  official: OFFICIAL_STYLE_GUIDE,
  rizz: RIZZ_STYLE_GUIDE,
} as const;

/** Hardcoded rizz lines for specific places - always returned verbatim, no model call.
 * Matched by a loose prefix/pattern so common typos ("samtes", "samche", "samtsi") still hit. */
const PRESET_RIZZ_LINES: Array<{ pattern: RegExp; line: string }> = [
  {
    pattern: /samt/i,
    line: 'Are you from Samtse? Because I want to keep my "tha dam tshi".',
  },
];

function presetRizzLine(note: string | undefined): string | null {
  if (!note) return null;
  const match = PRESET_RIZZ_LINES.find(({ pattern }) => pattern.test(note));
  return match?.line ?? null;
}

type Mode = keyof typeof SYSTEM_PROMPTS;
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

interface GenerateBody {
  mode?: Mode;
  note?: string;
  imageBase64?: string;
  mediaType?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GenerateBody | null;

  if (!body?.mode || !(body.mode in SYSTEM_PROMPTS)) {
    return NextResponse.json({ error: "mode must be 'official' or 'rizz'" }, { status: 400 });
  }
  if (!body.imageBase64 && !body.note?.trim()) {
    return NextResponse.json({ error: "Upload an image or add some text" }, { status: 400 });
  }

  if (body.mode === "rizz") {
    const preset = presetRizzLine(body.note);
    if (preset) return NextResponse.json({ result: preset });
  }

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  if (body.imageBase64 && body.mediaType) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: body.mediaType as ImageMediaType,
        data: body.imageBase64,
      },
    });
  }
  content.push({
    type: "text",
    text:
      (body.mode === "rizz" && body.note?.trim()
        ? `Here's the photo. She's from ${body.note.trim()}.`
        : body.note?.trim()) ||
      (body.mode === "official"
        ? "Here's a screenshot of the meeting I need to skip/leave."
        : "Here's the photo - hit me with your best line."),
  });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      system: SYSTEM_PROMPTS[body.mode],
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const result = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return NextResponse.json({ result });
  } catch (err) {
    console.error("generate failed", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
