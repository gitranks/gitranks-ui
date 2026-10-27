/**
 * Auto badges without `theme` are one SVG holding a light and a dark drawing (spec §4.3): a `prefers-color-scheme`
 * rule shows the one that fits the reader's theme, also inside an `<img>`.
 */
export const AUTO_STYLE =
  '<style>.d{display:none}@media (prefers-color-scheme: dark){.l{display:none}.d{display:inline}}</style>';

const ROOT = /^<svg\b[^>]*>/;

/**
 * Prefixes every id of a drawing and every reference to one, so two drawings can share a document. Ids inside
 * embedded images are escaped there (`%23`, base64), so only the drawing's own markup changes.
 */
export function prefixIds(svg: string, prefix: string): string {
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)\s]+)\)/g, (_, id: string) => `url(#${prefix}${id})`)
    .replace(/\b(xlink:href|href)="#([^"]+)"/g, (_, attribute: string, id: string) => `${attribute}="#${prefix}${id}"`);
}

function split(svg: string) {
  const open = ROOT.exec(svg)?.[0];
  if (!open || !svg.endsWith('</svg>')) {
    throw new Error('A drawing must be one <svg> element');
  }
  const size = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(open)?.[1] ?? 0);
  return { open, inner: svg.slice(open.length, -'</svg>'.length), width: size('width'), height: size('height') };
}

/** One SVG with both drawings, the light one in `.l` and the dark one in `.d`. */
export function joinAuto(light: string, dark: string): string {
  const l = split(prefixIds(light, 'l-'));
  const d = split(prefixIds(dark, 'd-'));
  const width = Math.max(l.width, d.width);
  const height = Math.max(l.height, d.height);
  const open = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  return `${open}${AUTO_STYLE}<g class="l">${l.inner}</g><g class="d">${d.inner}</g></svg>`;
}
