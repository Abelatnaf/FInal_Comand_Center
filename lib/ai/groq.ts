import type { ChatMessage } from "./types";

// Groq's free tier (console.groq.com) — no credit card required, fast
// inference over open models. GPT-OSS 120B is the strongest reasoning model
// Groq hosts; Llama 3.3 70B is the proven fallback if it's unavailable on
// a given key.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_SMART = "openai/gpt-oss-120b";
export const GROQ_FALLBACK = "llama-3.3-70b-versatile";

export async function askGroq(
  system: string,
  messages: ChatMessage[],
  model: string = GROQ_SMART
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("The AI assistant isn't set up yet — GROQ_API_KEY needs to be added as an environment variable.");
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 2048,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) throw new Error("AI response didn't include any text.");
  return text;
}
