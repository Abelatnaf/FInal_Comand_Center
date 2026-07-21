import React from "react";

// A small, dependency-free renderer for the light Markdown the assistant
// produces — bold/italic/code inline, bullet and numbered lists, headings,
// and paragraphs. Deliberately minimal: the assistant is prompted to keep
// formatting light, so this just makes what it does use render cleanly
// instead of showing raw ** / ### / - characters.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${keyBase}-${i++}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={`${keyBase}-${i++}`}>{m[3]}</em>);
    else if (m[4] !== undefined)
      nodes.push(
        <code key={`${keyBase}-${i++}`} className="px-1 py-0.5 rounded bg-[var(--fill-tertiary)] text-[0.9em]">
          {m[4]}
        </code>
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // blank line
    if (trimmed === "") {
      i++;
      continue;
    }

    // horizontal rule — skip (the assistant is told not to use these, but be safe)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      i++;
      continue;
    }

    // heading — render as a bold line (no oversized headers inside a chat bubble)
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={key++} className="font-semibold mt-1">
          {renderInline(heading[1], `h${key}`)}
        </p>
      );
      i++;
      continue;
    }

    // bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 flex flex-col gap-1 my-1">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ul${key}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 flex flex-col gap-1 my-1">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ol${key}-${idx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // paragraph — join consecutive plain lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
