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
 * Whether a request's `Accept` asks for markdown over HTML: `text/markdown` is named with a q above the one HTML gets
 * (an explicit `text/html`, else `text/*`, else `*\/*`, else 0). So `text/markdown, *\/*;q=0.1` is markdown, while `*\/*`
 * alone, `text/html`, and the tie `text/markdown, text/html` stay HTML.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const entries = entriesOf(accept);
  const qOf = (type: string) => entries.find((entry) => entry.type === type)?.q;
  const markdown = qOf('text/markdown');
  if (markdown === undefined || markdown <= 0) return false;
  const html = qOf('text/html') ?? qOf('text/*') ?? qOf('*/*') ?? 0;
  return markdown > html;
}
