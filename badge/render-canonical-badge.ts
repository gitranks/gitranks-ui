import {
  type CanonicalBadgeFormat,
  type CanonicalBadgeVariant,
  getCanonicalBadgeParams,
} from '@/badge/canonical-badge';
import { renderInlineBadgeResult } from '@/badge/templates/inline/inline.render';

export async function renderCanonicalBadge(
  login: string,
  variant: CanonicalBadgeVariant,
  format: CanonicalBadgeFormat,
): Promise<{ body: Uint8Array<ArrayBuffer> | string; contentType: string } | null> {
  const { svg, error } = await renderInlineBadgeResult({
    login,
    params: getCanonicalBadgeParams(variant),
  });

  // These URLs are sitemapped and pushed to IndexNow — an "ERROR" image must 404,
  // not become an indexable canonical asset.
  if (error || !svg) {
    return null;
  }

  if (format === 'svg') {
    return { body: svg, contentType: 'image/svg+xml; charset=utf-8' };
  }

  // Lazy-load native binding only for PNG so SVG responses stay independent of resvg.
  const { Resvg } = await import('@resvg/resvg-js');
  // Upscale for Image Search / social sharpness (inline badges are 20px tall).
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'height', value: 80 },
  });

  // resvg types its Buffer as ArrayBufferLike, which `BodyInit` rejects; the typed-array
  // constructor re-widens it to a plain ArrayBuffer so the route can stream it as-is.
  return { body: new Uint8Array(resvg.render().asPng()), contentType: 'image/png' };
}
