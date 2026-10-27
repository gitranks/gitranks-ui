import type { ReactElement, ReactNode } from 'react';

import { Mark, TierGlyph } from './glyphs';
import { type CardPalette, tierColor } from './schemes';
import { MONO_FONT } from './shield';

/** Cards and charts scale their type with their width: 400px cards, 800px charts. */
export type FrameScale = 1 | 1.5;

export function CardFrame({
  palette,
  logo,
  title,
  name,
  width,
  height,
  scale = 1,
  children,
}: Readonly<{
  palette: CardPalette;
  logo: boolean;
  /** The eyebrow after "gitranks", if any. */
  title?: string;
  /** The entity, at the right of the eyebrow. */
  name: string;
  width: number;
  height: number;
  scale?: FrameScale;
  children: ReactNode;
}>): ReactElement {
  const eyebrow = 10 * scale;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        padding: `${14 * scale}px ${16 * scale}px`,
        backgroundColor: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: 10 * scale,
        color: palette.text,
        fontFamily: 'Inter',
        fontWeight: 400,
        fontSize: 11 * scale,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: eyebrow,
          fontWeight: 600,
          letterSpacing: eyebrow * 0.08,
          textTransform: 'uppercase',
          color: palette.muted,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {logo ? (
            <div style={{ display: 'flex', marginRight: 5 * scale }}>
              <Mark size={13 * scale} colors={palette.mark} />
            </div>
          ) : null}
          <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>{title ? `gitranks · ${title}` : 'gitranks'}</div>
        </div>
        <div
          style={{
            display: 'block',
            marginLeft: 12 * scale,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: width * 0.5,
          }}
        >
          {name}
        </div>
      </div>
      {children}
    </div>
  );
}

/** satori reads every style key it is given: leave out the ones without a value. */
export function css(style: Record<string, unknown>): Record<string, string | number> {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined)) as Record<
    string,
    string | number
  >;
}

/** Text in the mono face, for numbers. */
export function Num({
  children,
  size,
  color,
}: Readonly<{ children: ReactNode; size?: number; color?: string }>): ReactElement {
  return (
    <div
      style={css({ display: 'flex', fontFamily: MONO_FONT, fontWeight: 700, fontSize: size, color, whiteSpace: 'pre' })}
    >
      {children}
    </div>
  );
}

/** A line of text runs side by side. */
export function Line({
  children,
  color,
  size,
  style,
}: Readonly<{ children: ReactNode; color?: string; size?: number; style?: Record<string, unknown> }>) {
  return (
    <div style={css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', color, fontSize: size, ...style })}>
      {children}
    </div>
  );
}

export function Words({ children, color }: Readonly<{ children: ReactNode; color?: string }>) {
  return <div style={css({ display: 'flex', whiteSpace: 'pre', color })}>{children}</div>;
}

/**
 * An avatar, round or (for organizations) rounded square; a disk in the placeholder colour when it could not be
 * fetched. A developer tier, if any, sits in its corner as the tier glyph on a disk ringed in the card's ground.
 */
export function Avatar({
  src,
  size,
  palette,
  square = false,
  tier,
  border,
}: Readonly<{
  src: string | null;
  size: number;
  palette: CardPalette;
  square?: boolean;
  tier?: number | null;
  /** A ring in the ground colour, for stacked avatars. */
  border?: number;
}>): ReactElement {
  const radius = square ? size / 5 : size / 2;
  const badge = Math.round(size * 0.42);
  const ring = Math.max(1.5, size / 18);
  return (
    <div
      style={css({
        display: 'flex',
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius,
        border: border ? `${border}px solid ${palette.ring}` : undefined,
        backgroundColor: palette.placeholder,
      })}
    >
      {src ? (
        <img
          src={src}
          width={size - 2 * (border ?? 0)}
          height={size - 2 * (border ?? 0)}
          style={{ borderRadius: radius }}
          alt=""
        />
      ) : null}
      {tier ? (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            right: -ring - 1,
            bottom: -ring - 1,
            width: badge + 2 * ring,
            height: badge + 2 * ring,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: badge,
            backgroundColor: palette.ring,
          }}
        >
          <TierGlyph icon={{ kind: 'user-tier', tier }} size={badge} color={tierColor(tier, palette.ground)} />
        </div>
      ) : null}
    </div>
  );
}

/** Round numbers for a chart's y axis: about four steps from 0 to above `max`. */
export function axisTicks(max: number): number[] {
  if (!(max > 0)) {
    return [0, 1];
  }
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) {
    ticks.push(value);
  }
  return ticks;
}
