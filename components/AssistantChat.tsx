"use client";

import { useRef, useState, useTransition } from "react";
import { askAssistant } from "@/app/(app)/assistant/actions";
import type { ChatMessage } from "@/lib/ai/anthropic";

const SUGGESTIONS = [
  "How much have I spent this month?",
  "Am I over budget anywhere?",
  "What's my biggest expense category recently?",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setError(null);

    startTransition(async () => {
      const result = await askAssistant(next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply! }]);
      requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    });
  }

  return (
    <div className="flex flex-col">
      <div className="glass p-4 mb-3 min-h-[320px] max-h-[55vh] overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
            <p className="ios-subhead text-text-dim text-center">
              Ask about your spending, budgets, or accounts — grounded in your real data.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="btn text-[13px] !py-2">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] ${m.role === "user" ? "self-end" : "self-start"}`}>
              <div
                className={`rounded-[14px] px-3.5 py-2.5 ios-body whitespace-pre-wrap ${
                  m.role === "user" ? "bg-[var(--blue)] text-white" : "bg-[var(--fill-tertiary)] text-text"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {pending && (
          <div className="self-start max-w-[85%]">
            <div className="rounded-[14px] px-3.5 py-2.5 bg-[var(--fill-tertiary)] text-text-dim ios-body">
              Thinking…
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {error && <p className="text-red text-[14px] mb-3">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your money…"
          className="input flex-1"
        />
        <button type="submit" disabled={pending || !input.trim()} className="btn btn-primary !px-5">
          Ask
        </button>
      </form>
    </div>
  );
}
