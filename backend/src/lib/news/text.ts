const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
  "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”", "&ndash;": "–", "&mdash;": "—",
};

export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#(\d+)|#x([0-9a-f]+));/gi, (_, d, h) => {
      const code = d ? parseInt(d, 10) : parseInt(h, 16);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    })
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips "[+1234 chars]" truncation markers and trailing " - Publisher" from titles. */
export function cleanHeadline(title: string, publisher?: string): string {
  let t = stripHtml(title);
  if (publisher) {
    const esc = publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\s[-–|]\\s${esc}\\s*$`, "i"), "");
  }
  return t.trim();
}

export function cleanDescription(desc: string | null | undefined): string {
  return stripHtml(desc).replace(/\[\+?\d+ chars\]/gi, "").replace(/\s*(…|\.\.\.)\s*$/, "").trim();
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])(["')\]]*)\s+(?=[A-Z0-9"'(])/g, "$1$2\u0000")
    .split("\u0000")
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

const STOP = new Set(
  "a an the of in on at to for from by with and or but is are was were be been as it its this that these those after before over under into amid says said say new news live updates update will would could may might has have had not no than then their his her they he she we you i our us up out off about more most".split(" "),
);

export function tokenize(title: string): string[] {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w)),
    ),
  );
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  let inter = 0;
  for (const x of a) if (sb.has(x)) inter++;
  return inter / (a.length + b.length - inter);
}

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|cmpid|ocid|taid)/i.test(k)) u.searchParams.delete(k);
    }
    u.hostname = u.hostname.replace(/^www\./, "");
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

export function readMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  // We only hold a summary; the minutes estimate is for the original article
  // and is deliberately conservative: at least 2 minutes for a news story.
  return Math.max(2, Math.min(12, Math.round((words * 8) / 200)));
}
