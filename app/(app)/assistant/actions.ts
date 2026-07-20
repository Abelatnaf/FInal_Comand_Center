"use server";

import { createClient } from "@/lib/supabase/server";
import { buildSpendingContext } from "@/lib/ai/spending-context";
import { askGemini } from "@/lib/ai/gemini";
import type { ChatMessage } from "@/lib/ai/types";

const SYSTEM_PREAMBLE = `You are a helpful, concise financial assistant embedded in Command Deck, a personal finance app. You answer questions about the user's own spending, income, budgets, accounts, and savings goals, grounded strictly in the real data provided below. Rules:
- Only use the data given here — never invent transactions, balances, or numbers.
- If the data doesn't cover what's asked (e.g. something outside the ~90-day window shown), say so plainly rather than guessing.
- You cannot add, edit, or delete anything — you're read-only. If asked to log an entry, tell the user to use the + button instead.
- Keep answers short and concrete. Use the app's currency for figures.
- This is not professional financial advice; keep any suggestions general and say so if it edges into advice territory.`;

export type ChatResult = { reply?: string; error?: string };

export async function askAssistant(history: ChatMessage[]): Promise<ChatResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  if (history.length === 0) return { error: "Ask something first." };

  try {
    const context = await buildSpendingContext();
    const reply = await askGemini(`${SYSTEM_PREAMBLE}\n\n${context}`, history);
    return { reply };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong asking the assistant." };
  }
}
