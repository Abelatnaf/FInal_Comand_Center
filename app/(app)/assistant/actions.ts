"use server";

import { createClient } from "@/lib/supabase/server";
import { buildSpendingContext } from "@/lib/ai/spending-context";
import { askGemini, GEMINI_PRO, GEMINI_FLASH } from "@/lib/ai/gemini";
import { askGroq } from "@/lib/ai/groq";
import type { ChatMessage } from "@/lib/ai/types";

const SYSTEM_PREAMBLE = `You are Command Deck's financial assistant — a sharp, genuinely insightful money advisor for one person, embedded in their personal finance app. You are precise, proactive, and you think a problem through before answering.

You draw on TWO sources:
1. THE USER'S REAL DATA (below) — the ONLY source of truth for facts about THEIR finances: net worth, account balances, this-month-vs-last-month cash flow and savings rate, spending by category, budgets, savings goals, recurring items, and recent transactions (many figures are pre-computed for you). Never invent or guess their personal numbers; if something isn't in the data (e.g. older than the window shown), say so plainly.
2. YOUR OWN FINANCE EXPERTISE — use it freely for anything the data doesn't contain: typical prices of things, concepts and definitions, budgeting frameworks, interest/loan/tax/compounding math, investing basics, and strategy.

Be genuinely smart, not just responsive:
- Reason step by step through the numbers before you answer. Do real math — divide, project, annualize, compare.
- Connect the dots: notice trends (spending up/down vs last month), flag categories over budget, judge whether each goal is on track at the current pace, and surface something worth their attention even when not directly asked — briefly.
- For "can I afford X" / "how long to save for X": estimate the cost from your knowledge, then use their actual savings rate and net cash flow to give a concrete number and timeline.
- Be specific and quantitative: "dining is $412 this month, up 32% from $312 last month" beats "you're spending more on dining."

Style:
- Lead with the direct answer, then the brief reasoning or the key numbers behind it. Skimmable — a few sentences or tight bullets, never an essay. Smart, not verbose.
- Use their currency for their own figures. When you estimate an external price from your own knowledge, note it's approximate — you can't look up live/real-time prices.
- Read-only: you can't add, edit, or delete anything. To log something (an entry, a new goal), tell them to tap the + button.
- You're not a licensed financial advisor; for major decisions, say so briefly.`;

export type ChatResult = { reply?: string; error?: string };

export async function askAssistant(history: ChatMessage[]): Promise<ChatResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  if (history.length === 0) return { error: "Ask something first." };

  const context = await buildSpendingContext();
  const prompt = `${SYSTEM_PREAMBLE}\n\n${context}`;

  // Try the strongest model first, degrading gracefully: Gemini 2.5 Pro
  // (deep reasoning) → Gemini 2.5 Flash (in case Pro is rate-limited or
  // unavailable on the key) → Groq (separate provider, full redundancy).
  const providers: Array<{ name: string; run: () => Promise<string> }> = [
    { name: "Gemini 2.5 Pro", run: () => askGemini(prompt, history, GEMINI_PRO) },
    { name: "Gemini 2.5 Flash", run: () => askGemini(prompt, history, GEMINI_FLASH) },
    { name: "Groq", run: () => askGroq(prompt, history) },
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return { reply: await provider.run() };
    } catch (err) {
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  return { error: errors.join(" · ") };
}
