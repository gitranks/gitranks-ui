import type { ReactElement } from 'react';

import { Mark, TierGlyph } from './glyphs';
import { type Block, readableOn, type ShieldPalette, toneColor } from './schemes';
import type { Segment, ShieldContent } from './types';

export const SHIELD_HEIGHT = 20;
export const SHIELD_RADIUS = 4;
export const SHIELD_FONT_SIZE = 11;
export const SHIELD_PADDING = 6;
export const MARK_SIZE = 13;
const GAP = 4;
const ICON_SIZE = 12;

export const MONO_FONT = 'JetBrains Mono';

function SegmentBlock({
  segment,
  block,
  palette,
  lead,
}: Readonly<{ segment: Segment; block: Block; palette: ShieldPalette; lead?: ReactElement }>) {
  const tone = (value: Segment['tone'], fallback: string) =>
    readableOn(toneColor(value, palette.ground, fallback), block.background, block.text);
  const baseColor = tone(segment.tone, block.text);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: SHIELD_HEIGHT,
        padding: `0 ${SHIELD_PADDING}px`,
        backgroundColor: block.background,
        color: baseColor,
      }}
    >
      {lead}
      {segment.icon ? (
        <div style={{ display: 'flex', marginRight: GAP }}>
          <TierGlyph icon={segment.icon} size={ICON_SIZE} color={baseColor} />
        </div>
      ) : null}
      {segment.runs.map((run, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            whiteSpace: 'pre',
            color: run.tone ? tone(run.tone, baseColor) : baseColor,
            fontFamily: run.mono ? MONO_FONT : 'Inter',
            fontWeight: run.mono ? 700 : 600,
          }}
        >
          {run.text}
        </div>
      ))}
    </div>
  );
}

/** A 20px shield: label, value and an optional extra, the podium mark leading the label unless `logo` is off. */
export function Shield({
  content,
  palette,
  logo,
}: Readonly<{ content: ShieldContent; palette: ShieldPalette; logo: boolean }>): ReactElement {
  const mark = logo ? (
    <div style={{ display: 'flex', marginRight: GAP }}>
      <Mark size={MARK_SIZE} colors={palette.mark} />
    </div>
  ) : undefined;

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
      <SegmentBlock segment={{ runs: [{ text: content.label }] }} block={palette.label} palette={palette} lead={mark} />
      <SegmentBlock segment={content.value} block={palette.value} palette={palette} />
      {content.extra ? <SegmentBlock segment={content.extra} block={palette.extra} palette={palette} /> : null}
      {palette.hairline ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `1px solid ${palette.hairline}`,
            borderRadius: SHIELD_RADIUS,
          }}
        />
      ) : null}
    </div>
  );
}
