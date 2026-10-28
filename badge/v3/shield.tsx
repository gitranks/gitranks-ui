import type { ReactElement, ReactNode } from 'react';

import { Mark, TierGlyph } from './glyphs';
import { type Block as BlockColors, readableOn, type ShieldPalette, toneColor } from './schemes';
import type { Segment, ShieldContent } from './types';

export const SHIELD_HEIGHT = 20;
export const SHIELD_RADIUS = 4;
export const SHIELD_FONT_SIZE = 11;
export const SHIELD_PADDING = 6;
export const MARK_SIZE = 13;
const GAP = 4;
const ICON_SIZE = 12;
/**
 * Inter's line box sets its glyphs about 1px lower than JetBrains Mono's at this size, so the label, the extra and any
 * Inter run sit 1px up: every run then shares the mono value's baseline, and the caps are centred in the 20px block.
 */
const INTER_LIFT = { position: 'relative', top: -1 } as const;

export const MONO_FONT = 'JetBrains Mono';

/** A segment's glyph and text runs; `base` colours runs without a tone of their own. */
function Runs({
  segment,
  base,
  tone,
  weight,
}: Readonly<{
  segment: Segment;
  base: string;
  tone: (value: Segment['tone'], fallback: string) => string;
  weight: number;
}>) {
  const color = segment.tone ? tone(segment.tone, base) : base;
  return (
    <>
      {segment.icon ? (
        <div style={{ display: 'flex', marginRight: GAP }}>
          <TierGlyph icon={segment.icon} size={ICON_SIZE} color={color} />
        </div>
      ) : null}
      {segment.runs.map((run, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            whiteSpace: 'pre',
            color: run.tone ? tone(run.tone, color) : color,
            fontFamily: run.mono ? MONO_FONT : 'Inter',
            fontWeight: run.mono ? 700 : weight,
            ...(run.mono ? null : INTER_LIFT),
          }}
        >
          {run.text}
        </div>
      ))}
    </>
  );
}

function Block({ block, children }: Readonly<{ block: BlockColors; children: ReactNode }>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: SHIELD_HEIGHT,
        padding: `0 ${SHIELD_PADDING}px`,
        backgroundColor: block.background,
        color: block.text,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A 20px shield in two blocks: the label, led by the podium mark unless `logo` is off; and the value, its extra after
 * " · " in a muted tone.
 */
export function Shield({
  content,
  palette,
  logo,
}: Readonly<{ content: ShieldContent; palette: ShieldPalette; logo: boolean }>): ReactElement {
  const { value } = palette;
  // On a tier fill the tier is the ground itself: its tone is plain text there.
  const tone = (role: Segment['tone'], fallback: string) =>
    palette.tierFill && role && typeof role === 'object'
      ? fallback
      : readableOn(toneColor(role, palette.ground, fallback), value.background, fallback);

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        height: SHIELD_HEIGHT,
        borderRadius: SHIELD_RADIUS,
        overflow: 'hidden',
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: SHIELD_FONT_SIZE,
      }}
    >
      <Block block={palette.label}>
        {logo ? (
          <div style={{ display: 'flex', marginRight: GAP }}>
            <Mark size={MARK_SIZE} colors={palette.mark} />
          </div>
        ) : null}
        <div style={{ display: 'flex', whiteSpace: 'pre', ...INTER_LIFT }}>{content.label}</div>
      </Block>
      <Block block={value}>
        <Runs segment={content.value} base={value.text} tone={tone} weight={600} />
        {content.extra ? (
          <>
            <div
              style={{
                display: 'flex',
                whiteSpace: 'pre',
                marginLeft: GAP,
                color: palette.muted,
                fontWeight: 500,
                ...INTER_LIFT,
              }}
            >
              {'· '}
            </div>
            <Runs segment={content.extra} base={palette.muted} tone={tone} weight={500} />
          </>
        ) : null}
      </Block>
      {palette.edge ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `1px solid ${palette.edge}`,
            borderRadius: SHIELD_RADIUS,
          }}
        />
      ) : null}
    </div>
  );
}
