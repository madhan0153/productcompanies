// Renders job descriptions that come in as plain text or messy markdown.
// Detects common heading patterns ("Responsibilities:", "Requirements:") and
// turns dash/bullet lines into proper <ul>s. Keeps everything semantic so
// the prose styling from globals applies.

const HEADING_RE = /^(?:about (?:the )?role|what you[''']?ll do|responsibilities|requirements|qualifications|nice to have|preferred|benefits|what we offer|what you[''']?ll bring)[:.]?$/i;
const BULLET_RE = /^\s*(?:[-•*●◦]|\d+[.)])\s+/;

type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim());
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let listBuffer: string[] = [];

  const flushPara = () => {
    if (buffer.length) {
      blocks.push({ kind: "para", text: buffer.join(" ") });
      buffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ kind: "list", items: [...listBuffer] });
      listBuffer = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (HEADING_RE.test(line.replace(/[:.]$/, ""))) {
      flushPara();
      flushList();
      blocks.push({ kind: "heading", text: line.replace(/[:.]$/, "") });
      continue;
    }
    if (BULLET_RE.test(line)) {
      flushPara();
      listBuffer.push(line.replace(BULLET_RE, ""));
      continue;
    }
    flushList();
    buffer.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function JobDescription({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">No description available.</p>;
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h3
              key={i}
              className="font-display text-sm font-semibold uppercase tracking-wider text-foreground"
            >
              {b.text}
            </h3>
          );
        }
        if (b.kind === "list") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-primary/60">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
        }
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
