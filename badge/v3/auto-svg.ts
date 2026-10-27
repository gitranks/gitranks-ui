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

const IMAGE =
  /<image x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)" href="(data:image\/[^"]+)"([^>]*)\/>/g;

/**
 * Embeds each image once: an avatar or a tier glyph drawn in both drawings, or many times in one, becomes one `<image>`
 * in `<defs>` and a `<use>` at each place. The clip and mask stay on a wrapping group, so they keep the drawing's coordinates.
 */
export function shareImages(svg: string): string {
  const counts = new Map<string, number>();
  for (const [, , , width, height, href] of svg.matchAll(IMAGE)) {
    const key = `${width} ${height} ${href}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ids = new Map<string, string>();
  const defs: string[] = [];
  const shared = svg.replace(
    IMAGE,
    (image, x: string, y: string, width: string, height: string, href: string, rest: string) => {
      const key = `${width} ${height} ${href}`;
      if ((counts.get(key) ?? 0) < 2) return image;
      let id = ids.get(key);
      if (!id) {
        id = `img-${ids.size}`;
        ids.set(key, id);
        const aspect = /preserveAspectRatio="[^"]*"/.exec(rest)?.[0] ?? '';
        defs.push(
          `<image id="${id}" width="${width}" height="${height}" href="${href}"${aspect ? ` ${aspect}` : ''}/>`,
        );
      }
      const group = rest.replace(/\s*preserveAspectRatio="[^"]*"/, '');
      return `<g${group}><use href="#${id}" x="${x}" y="${y}"/></g>`;
    },
  );
  if (!defs.length) return svg;
  const open = ROOT.exec(shared)?.[0] ?? '';
  return `${open}<defs>${defs.join('')}</defs>${shared.slice(open.length)}`;
}

/** One SVG with both drawings, the light one in `.l` and the dark one in `.d`; shared images embedded once. */
export function joinAuto(light: string, dark: string): string {
  const l = split(prefixIds(light, 'l-'));
  const d = split(prefixIds(dark, 'd-'));
  const width = Math.max(l.width, d.width);
  const height = Math.max(l.height, d.height);
  const open = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  return shareImages(`${open}${AUTO_STYLE}<g class="l">${l.inner}</g><g class="d">${d.inner}</g></svg>`);
}
