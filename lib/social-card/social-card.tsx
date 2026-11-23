import 'server-only';

import type { ReactElement } from 'react';
import satori from 'satori';

import { svgToPng } from '@/badge/repo/render-star-history-badge';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';

export { CARD_COLORS, Figure, Frame } from './card-parts';

// The site's standalone link-preview cards (the Unsung heroes archive, a developer's Learn progress, a lesson and its
// fun fact): 1200×630 PNGs in the site's light colours, a violet top border, an eyebrow, the wordmark and big mono
// figures. Their parts are in `card-parts.tsx`.

const FONTS = [
  { weight: 400 as const },
  { weight: 600 as const },
  { weight: 700 as const },
  { name: 'JetBrains Mono' as const, weight: 700 as const },
];

/** A card drawn as a PNG at `SOCIAL_CARD_SIZE`. */
export async function drawSocialCard(node: ReactElement): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await satori(node, await getSatoriConfig({ fontOptions: FONTS, ...SOCIAL_CARD_SIZE }));
  return svgToPng(svg, SOCIAL_CARD_SIZE.width);
}
