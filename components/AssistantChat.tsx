"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askAssistant } from "@/app/(app)/assistant/actions";
import type { ChatMessage } from "@/lib/ai/types";

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M12 5l-6 6M12 5l6 6" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4L12 3.5Z" />
      <path d="M18.5 14l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z" />
    </svg>
  );
}

function TypingBubble() {
  return (
    <div className="self-start max-w-[78%]">
      <div className="rounded-[20px] rounded-bl-[6px] px-4 py-3 bg-[var(--fill-tertiary)] flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

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
    });
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-150px)]">
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-1 pb-2">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[rgba(10,132,255,0.12)] text-tint flex items-center justify-center">
              <SparkleIcon />
            </div>
            <h1 className="ios-title2">Assistant</h1>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`max-w-[78%] ${m.role === "user" ? "self-end" : "self-start"}`}>
              <div
                className={`px-4 py-2.5 ios-body whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[var(--blue)] text-white rounded-[20px] rounded-br-[6px]"
                    : "bg-[var(--fill-tertiary)] text-text rounded-[20px] rounded-bl-[6px]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {pending && <TypingBubble />}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-red text-[13px] mb-2 px-1">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 material rounded-full px-2 py-2 border border-[var(--separator)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything"
          className="flex-1 bg-transparent border-none outline-none px-2.5 text-[16px] text-text placeholder:text-text-faint"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Send"
          className="w-8 h-8 rounded-full bg-[var(--blue)] text-white flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:bg-[var(--fill-tertiary)] disabled:text-text-faint"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
