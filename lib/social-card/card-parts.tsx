import type { ReactElement, ReactNode } from 'react';

import { Mark } from '@/badge/v3/glyphs';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { MARK_LIGHT } from '@/badge/v3/schemes';

// The parts of the site's link-preview cards, as plain elements: the server draws them as PNGs (`social-card.tsx`),
// and the design catalogue draws the same elements on its boards.

export const CARD_COLORS = {
  ink: '#0a0a0a',
  muted: '#525252',
  violet: '#7f22fe',
  positive: '#16a34a',
  paper: '#ffffff',
  rule: '#e5e5e5',
} as const;

/** A big figure over its label: a number in mono, or a name (`mono` false) in the text's type, a little smaller. */
export function Figure({
  value,
  label,
  color = CARD_COLORS.ink,
  mono = true,
}: Readonly<{ value: string; label: string; color?: string; mono?: boolean }>): ReactElement {
  const type = mono ? { fontFamily: 'JetBrains Mono', fontSize: 60 } : { fontFamily: 'Inter', fontSize: 52 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', ...type, fontWeight: 700, color }}>{value}</div>
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
  eyebrowColor,
  children,
}: Readonly<{
  eyebrow: string;
  brand?: 'start' | 'end';
  /** The eyebrow's colour where it is not the brand's default (grey after the logo, violet before the wordmark). */
  eyebrowColor?: string;
  children: ReactNode;
}>): ReactElement {
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
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 3,
              color: eyebrowColor ?? CARD_COLORS.muted,
            }}
          >
            {eyebrow.toUpperCase()}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 3,
              color: eyebrowColor ?? CARD_COLORS.violet,
            }}
          >
            {eyebrow.toUpperCase()}
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>GitRanks</div>
        </div>
      )}
      {children}
    </div>
  );
}
