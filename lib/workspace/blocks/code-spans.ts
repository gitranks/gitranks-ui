/** Text with `code` spans, split into its plain and code parts, in order. */
export function codeSpansOf(text: string): { code: boolean; text: string }[] {
  const parts: { code: boolean; text: string }[] = [];
  const pattern = /`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ code: false, text: text.slice(last, match.index) });
    parts.push({ code: true, text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ code: false, text: text.slice(last) });
  return parts;
}
