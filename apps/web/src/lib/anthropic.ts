import Anthropic from "@anthropic-ai/sdk";
import type { ExcuseTone } from "@zhay-bhai/shared";
import { EXCUSE_TONE_LABELS } from "@zhay-bhai/shared";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExcuseDraft {
  subject: string;
  body: string;
}

/**
 * Generates a short, believable "can't make it" email for a calendar event
 * using the given tone. The model is instructed to keep it brief, polite,
 * and to sign off with the user's first name (not fabricate a full identity).
 */
export async function generateExcuse({
  eventTitle,
  organizerName,
  tone,
  senderFirstName,
}: {
  eventTitle: string;
  organizerName: string | null;
  tone: ExcuseTone;
  senderFirstName: string;
}): Promise<ExcuseDraft> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 400,
    system:
      "You write short, polite, believable meeting-decline emails. " +
      "Return ONLY valid JSON with keys 'subject' and 'body', no markdown fences, no commentary. " +
      "The body should be 2-4 sentences, first person, no exaggeration, no fake specific details " +
      "(no invented doctor names, addresses, etc.), and should end with a one-line sign-off using the " +
      "sender's first name only.",
    messages: [
      {
        role: "user",
        content:
          `Write a decline email for the meeting "${eventTitle}"` +
          (organizerName ? ` organized by ${organizerName}` : "") +
          `. Reason category: ${EXCUSE_TONE_LABELS[tone]}. Sender's first name: ${senderFirstName}.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic response contained no text content");
  }

  const parsed = JSON.parse(textBlock.text) as ExcuseDraft;
  if (!parsed.subject || !parsed.body) {
    throw new Error("Anthropic response missing subject/body");
  }
  return parsed;
}
