import {
  type CanonicalBadgeFormat,
  type CanonicalBadgeVariant,
  getCanonicalBadgeParams,
} from '@/badge/canonical-badge';
import { renderInlineBadge } from '@/badge/templates/inline/inline.render';

export async function renderCanonicalBadge(
  login: string,
  variant: CanonicalBadgeVariant,
  format: CanonicalBadgeFormat,
): Promise<{ body: Uint8Array | string; contentType: string } | null> {
  const svg = await renderInlineBadge({
    login,
    params: getCanonicalBadgeParams(variant),
  });

  if (!svg) {
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
  const png = resvg.render().asPng();

  return { body: Uint8Array.from(png), contentType: 'image/png' };
}
