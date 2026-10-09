import { AI_ANSWER_MAX_LENGTH } from '@ai-mentor/shared';

/**
 * A small, safe Markdown subset for mentor answers: paragraphs, headings,
 * lists, fenced code, inline code, bold, italic and https links. Everything is
 * turned into plain data; nothing is ever interpreted as HTML or code.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string };

export type Block =
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'heading'; level: 1 | 2 | 3; inline: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { type: 'code'; language: string; code: string }
  | { type: 'rule' };

export type ParsedMarkdown = { blocks: Block[]; truncated: boolean };

export const MAX_BLOCKS = 200;
/** Longer paragraphs are shown as plain text, so inline parsing stays cheap. */
const MAX_INLINE_LENGTH = 5_000;
const MAX_INLINE_DEPTH = 3;
const MAX_URL_LENGTH = 2_048;

const FENCE = /^ {0,3}(```|~~~)\s*([A-Za-z0-9+#._-]{0,20})\s*$/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s{0,8}[-*+]\s+(.*)$/;
const ORDERED = /^\s{0,8}(\d{1,9})[.)]\s+(.*)$/;
const RULE = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}>\s?(.*)$/;
const CONTINUATION = /^\s{2,}\S/;

/** Only absolute https URLs on a real host. Everything else stays plain text. */
export function isSafeUrl(raw: string): boolean {
  if (raw.length === 0 || raw.length > MAX_URL_LENGTH || /\s/.test(raw)) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.hostname.length > 0 && !url.username && !url.password;
}

/** Inline parser with closer caching: a marker with no closer is never searched again. */
export function parseInline(text: string, depth = 0): Inline[] {
  if (text.length > MAX_INLINE_LENGTH || depth > MAX_INLINE_DEPTH) return [{ type: 'text', text }];

  const out: Inline[] = [];
  const noCloser = new Set<string>();
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer) out.push({ type: 'text', text: buffer });
    buffer = '';
  };
  const findCloser = (marker: string, from: number): number => {
    if (noCloser.has(marker)) return -1;
    const found = text.indexOf(marker, from);
    if (found === -1) noCloser.add(marker);
    return found;
  };

  while (index < text.length) {
    const char = text[index] as string;
    const next = text[index + 1];

    if (char === '`') {
      const end = findCloser('`', index + 1);
      if (end > index + 1) {
        flush();
        out.push({ type: 'code', text: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    } else if ((char === '*' || char === '_') && next === char) {
      const marker = char + char;
      const end = findCloser(marker, index + 2);
      if (end > index + 2) {
        flush();
        out.push({ type: 'bold', children: parseInline(text.slice(index + 2, end), depth + 1) });
        index = end + 2;
        continue;
      }
    } else if (char === '*' && next !== undefined && next !== ' ') {
      const end = findCloser('*', index + 1);
      if (end > index + 1 && text[end - 1] !== ' ') {
        flush();
        out.push({ type: 'italic', children: parseInline(text.slice(index + 1, end), depth + 1) });
        index = end + 1;
        continue;
      }
    } else if (
      char === '_' &&
      next !== undefined &&
      next !== ' ' &&
      !/[A-Za-z0-9]/.test(text[index - 1] ?? '')
    ) {
      // `_` only at word boundaries, so snake_case names stay intact.
      const end = findCloser('_', index + 1);
      if (end > index + 1 && !/[A-Za-z0-9]/.test(text[end + 1] ?? '')) {
        flush();
        out.push({ type: 'italic', children: parseInline(text.slice(index + 1, end), depth + 1) });
        index = end + 1;
        continue;
      }
    } else if (char === '[') {
      const closeText = findCloser('](', index + 1);
      if (closeText !== -1) {
        const closeUrl = text.indexOf(')', closeText + 2);
        const label = text.slice(index + 1, closeText);
        const url = closeUrl === -1 ? '' : text.slice(closeText + 2, closeUrl);
        if (closeUrl !== -1 && label.length > 0 && !label.includes('\n')) {
          flush();
          // Unsafe links keep only their label, as plain text.
          out.push(
            isSafeUrl(url) ? { type: 'link', text: label, url } : { type: 'text', text: label },
          );
          index = closeUrl + 1;
          continue;
        }
      }
    }

    buffer += char;
    index += 1;
  }
  flush();
  return out;
}

/** Parses an answer into blocks. Input is capped in length and blocks. */
export function parseMarkdown(
  source: string,
  maxLength: number = AI_ANSWER_MAX_LENGTH,
): ParsedMarkdown {
  let truncated = source.length > maxLength;
  const lines = source.slice(0, maxLength).replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;

  const push = (block: Block) => {
    if (blocks.length < MAX_BLOCKS) blocks.push(block);
    else truncated = true;
  };
  const flushParagraph = () => {
    if (paragraph.length > 0)
      push({ type: 'paragraph', inline: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) {
      push({
        type: 'list',
        ordered: list.ordered,
        start: list.start,
        items: list.items.map((item) => parseInline(item)),
      });
    }
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] as string;

    const fence = FENCE.exec(line);
    if (fence) {
      flushAll();
      const marker = fence[1] as string;
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] as string).trimStart().startsWith(marker)) {
        code.push(lines[index] as string);
        index += 1;
      }
      push({ type: 'code', language: fence[2] ?? '', code: code.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      flushAll();
      continue;
    }

    if (RULE.test(line)) {
      flushAll();
      push({ type: 'rule' });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushAll();
      const level = Math.min((heading[1] as string).length, 3) as 1 | 2 | 3;
      push({ type: 'heading', level, inline: parseInline(heading[2] ?? '') });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const text = (bullet ? bullet[1] : ordered?.[2]) ?? '';
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, start: ordered ? Number(ordered[1]) : 1, items: [] };
      }
      list.items.push(text);
      continue;
    }

    if (list && CONTINUATION.test(line) && list.items.length > 0) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }

    flushList();
    const quote = QUOTE.exec(line);
    paragraph.push(quote ? (quote[1] ?? '') : line);
  }
  flushAll();

  return { blocks, truncated };
}
