import { type ReactNode, createElement } from "react";

/**
 * Small Phosphor-styled markdown renderer — no extra deps.
 * Covers bold, italic, inline/fenced code, lists, links, headings, paragraphs.
 * Safe: builds React nodes only (no HTML string injection).
 */
export function Markdown({ source }: { source: string }) {
  const blocks = splitBlocks(source.replace(/\r\n/g, "\n"));
  return (
    <div className="ph-md space-y-3 leading-relaxed text-ph-bone">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; text: string };

function splitBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code
    const fence = /^```([\w-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || "";
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // closing fence
      out.push({ type: "code", lang, text: body.join("\n") });
      continue;
    }

    // Blank
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      out.push({
        type: "h",
        level: Math.min(heading[1]!.length, 3) as 1 | 2 | 3,
        text: heading[2]!.trim(),
      });
      i += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      out.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      out.push({ type: "ol", items });
      continue;
    }

    // Paragraph — gather until blank / structural
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^```/.test(lines[i] ?? "") &&
      !/^(#{1,3})\s+/.test(lines[i] ?? "") &&
      !/^\s*[-*+]\s+/.test(lines[i] ?? "") &&
      !/^\s*\d+\.\s+/.test(lines[i] ?? "")
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    out.push({ type: "p", text: para.join("\n") });
  }

  return out;
}

function Block({ block }: { block: Block }) {
  switch (block.type) {
    case "h": {
      const tag = (`h${block.level}` as "h1" | "h2" | "h3");
      const size =
        block.level === 1
          ? "font-display text-3xl leading-none tracking-tight"
          : block.level === 2
            ? "font-display text-2xl leading-none tracking-tight"
            : "font-mono text-sm tracking-wide uppercase text-ph-mute";
      return createElement(tag, { className: size }, renderInline(block.text));
    }
    case "ul":
      return (
        <ul className="list-disc space-y-1 pl-5 marker:text-ph-tool">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1 pl-5 marker:text-ph-tool">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre className="overflow-x-auto border-2 border-ph-border bg-ph-tile p-3 text-xs whitespace-pre-wrap text-ph-mute">
          {block.lang ? (
            <span className="mb-2 block text-[0.65rem] tracking-wide text-ph-dim uppercase">
              {block.lang}
            </span>
          ) : null}
          <code>{block.text}</code>
        </pre>
      );
    default:
      return <p className="whitespace-pre-wrap">{renderInline(block.text)}</p>;
  }
}

/** Inline: **bold**, *italic*, `code`, [label](url), plain URL. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: code first so * inside `...` is not italicized.
  const re =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))|(https?:\/\/[^\s<]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const [full, code, bold, italic, linkFull, , bareUrl] = m;

    if (code) {
      nodes.push(
        <code
          key={key++}
          className="border border-ph-border bg-ph-tile px-1 py-0.5 text-[0.85em] text-ph-tool"
        >
          {code.slice(1, -1)}
        </code>,
      );
    } else if (bold) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ph-bone">
          {bold.slice(2, -2)}
        </strong>,
      );
    } else if (italic) {
      nodes.push(
        <em key={key++} className="font-marginalia not-italic text-ph-mute">
          {italic.slice(1, -1)}
        </em>,
      );
    } else if (linkFull) {
      const label = linkFull.slice(1, linkFull.indexOf("]"));
      const href = linkFull.slice(linkFull.indexOf("(") + 1, -1);
      nodes.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ph-tool underline-offset-2 hover:underline"
        >
          {label}
        </a>,
      );
    } else if (bareUrl) {
      nodes.push(
        <a
          key={key++}
          href={bareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ph-tool underline-offset-2 hover:underline break-all"
        >
          {bareUrl}
        </a>,
      );
    } else {
      nodes.push(full);
    }
    last = m.index + full.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
