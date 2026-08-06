import { useStoredImage } from "@/lib/media";

type Segment =
  | { kind: "code"; text: string; lang?: string }
  | { kind: "text"; text: string };

/** Splits a message into fenced code blocks and plain runs. */
function segments(body: string): Segment[] {
  const out: Segment[] = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) out.push({ kind: "text", text: body.slice(last, m.index) });
    out.push({ kind: "code", text: m[2] ?? "", lang: m[1] });
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push({ kind: "text", text: body.slice(last) });
  return out;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(https?:\/\/[^\s<]+)/g;

function Inline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE);
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={m.index}
          className="rounded bg-foreground/8 px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={m.index} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <a
          key={m.index}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2 transition-colors duration-200 hover:text-neon"
        >
          {token.replace(/^https?:\/\//, "")}
        </a>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function firstLink(body: string) {
  const m = body.match(/https?:\/\/[^\s<]+/);
  if (!m) return null;
  try {
    return new URL(m[0]);
  } catch {
    return null;
  }
}

function LinkPreview({ url }: { url: URL }) {
  return (
    <a
      href={url.href}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-2 block rounded-lg border border-border/80 px-3 py-2.5 transition-colors duration-200 hover:border-neon"
    >
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {url.hostname.replace(/^www\./, "")}
      </div>
      <div className="mt-0.5 truncate text-[12.5px]">{url.pathname === "/" ? url.hostname : url.pathname}</div>
    </a>
  );
}

function Attachment({ path }: { path: string }) {
  const url = useStoredImage("message-images", path);
  if (!url) return <div className="mt-2 h-40 w-56 animate-pulse rounded-lg bg-foreground/10" />;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="mt-2 block">
      <img
        src={url}
        alt="Attachment"
        loading="lazy"
        decoding="async"
        className="max-h-64 w-auto max-w-full rounded-lg border border-border/60 object-cover"
      />
    </a>
  );
}

/** Renders message text with light markdown, links, previews and image attachments. */
export function MessageBody({ body, imagePath }: { body: string; imagePath?: string | null }) {
  const link = firstLink(body);
  return (
    <div className="text-[13.5px] leading-relaxed">
      {segments(body).map((seg, i) =>
        seg.kind === "code" ? (
          <pre
            key={i}
            className="my-2 overflow-x-auto rounded-lg border border-border/70 bg-foreground/[0.04] p-3 font-mono text-[12px] leading-relaxed"
          >
            <code>{seg.text.replace(/\n$/, "")}</code>
          </pre>
        ) : (
          <span key={i} className="whitespace-pre-wrap break-words">
            <Inline text={seg.text} />
          </span>
        ),
      )}
      {imagePath ? <Attachment path={imagePath} /> : null}
      {link && !imagePath ? <LinkPreview url={link} /> : null}
    </div>
  );
}
