/** One `Accept` entry: its type and its q. */
const entriesOf = (accept: string) =>
  accept.split(',').flatMap((part) => {
    const [type = '', ...params] = part.trim().toLowerCase().split(';');
    if (!type) return [];
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const value = q ? Number(q.slice(2)) : 1;
    return [{ type: type.trim(), q: Number.isFinite(value) ? value : 0 }];
  });

/**
 * Whether a request's `Accept` asks for markdown at least as much as HTML: `text/markdown` is named with a q at or above
 * the one HTML gets (an explicit `text/html`, else `text/*`, else `*\/*`, else 0). Browsers never name markdown, so a
 * tie is an agent's (`text/markdown, text/html` is markdown); `*\/*` alone and `text/html` stay HTML.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const entries = entriesOf(accept);
  const qOf = (type: string) => entries.find((entry) => entry.type === type)?.q;
  const markdown = qOf('text/markdown');
  if (markdown === undefined || markdown <= 0) return false;
  const html = qOf('text/html') ?? qOf('text/*') ?? qOf('*/*') ?? 0;
  return markdown >= html;
}
