import 'server-only';

import type { ReactElement, ReactNode } from 'react';
import satori from 'satori';

import { svgToPng } from '@/badge/repo/render-star-history-badge';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { Mark } from '@/badge/v3/glyphs';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { MARK_LIGHT } from '@/badge/v3/schemes';

// The site's standalone link-preview cards (the Unsung heroes archive, a developer's Learn progress): 1200×630 PNGs in
// the site's light colours, a violet top border, an eyebrow, the wordmark and big mono figures.

export const CARD_COLORS = {
  ink: '#0a0a0a',
  muted: '#525252',
  violet: '#7f22fe',
  positive: '#16a34a',
  paper: '#ffffff',
  rule: '#e5e5e5',
} as const;

const FONTS = [
  { weight: 400 as const },
  { weight: 600 as const },
  { weight: 700 as const },
  { name: 'JetBrains Mono' as const, weight: 700 as const },
];

/** A big mono figure over its label. */
export function Figure({
  value,
  label,
  color = CARD_COLORS.ink,
}: Readonly<{ value: string; label: string; color?: string }>): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 60, color }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 26, color: CARD_COLORS.muted }}>{label}</div>
    </div>
  );
}

/** The logo and the wordmark, as the site's header writes them. */
function Wordmark(): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Mark size={44} colors={MARK_LIGHT} />
      <div style={{ display: 'flex', fontSize: 36, fontWeight: 700 }}>gitranks</div>
    </div>
  );
}

/**
 * The card: a violet top border, then a header line, then the card's own content spaced to the bottom. `brand`
 * `start`: the logo and wordmark lead and the eyebrow follows in grey; `end` (the default): the violet eyebrow leads
 * and the wordmark "GitRanks" follows.
 */
export function Frame({
  eyebrow,
  brand = 'end',
  children,
}: Readonly<{ eyebrow: string; brand?: 'start' | 'end'; children: ReactNode }>): ReactElement {
  return (
    <div
      style={{
        width: SOCIAL_CARD_SIZE.width,
        height: SOCIAL_CARD_SIZE.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 72px',
        background: CARD_COLORS.paper,
        color: CARD_COLORS.ink,
        fontFamily: 'Inter',
        borderTop: `12px solid ${CARD_COLORS.violet}`,
      }}
    >
      {brand === 'start' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wordmark />
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, letterSpacing: 3, color: CARD_COLORS.muted }}>
            {eyebrow.toUpperCase()}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 3, color: CARD_COLORS.violet }}>
            {eyebrow.toUpperCase()}
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>GitRanks</div>
        </div>
      )}
      {children}
    </div>
  );
}

/** A card drawn as a PNG at `SOCIAL_CARD_SIZE`. */
export async function drawSocialCard(node: ReactElement): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await satori(node, await getSatoriConfig({ fontOptions: FONTS, ...SOCIAL_CARD_SIZE }));
  return svgToPng(svg, SOCIAL_CARD_SIZE.width);
}
