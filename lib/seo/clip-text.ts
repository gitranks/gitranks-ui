const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * `text` cut to at most `max` characters with a trailing `…`, at the last space when one falls in
 * the second half. Counts and cuts whole characters, so an emoji is never split.
 */
export function clipText(text: string, max: number): string {
  const chars = Array.from(graphemes.segment(text), (s) => s.segment);

  if (chars.length <= max) {
    return text;
  }

  const cut = chars.slice(0, max - 1).join('');
  const space = cut.lastIndexOf(' ');

  return `${space > cut.length / 2 ? cut.slice(0, space) : cut}…`;
}
