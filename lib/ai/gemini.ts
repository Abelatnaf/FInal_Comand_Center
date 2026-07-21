import type { ChatMessage } from "./types";

// Google's free, no-credit-card-required tier (Google AI Studio) — see
// https://aistudio.google.com/apikey. Gemini 2.5 Pro is Google's strongest
// reasoning model and thinks through problems by default; Flash is the fast
// fallback used when Pro is rate-limited or unavailable on a given key.
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_PRO = "gemini-2.5-pro";
export const GEMINI_FLASH = "gemini-2.5-flash";

export async function askGemini(
  system: string,
  messages: ChatMessage[],
  model: string = GEMINI_PRO
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("The AI assistant isn't set up yet — GEMINI_API_KEY needs to be added as an environment variable.");
  }

  const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      // Generous output budget so the model's thinking (on by default for
      // 2.5 Pro) doesn't eat into the visible answer and truncate it.
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (typeof text !== "string" || !text) throw new Error("AI response didn't include any text.");
  return text;
}
