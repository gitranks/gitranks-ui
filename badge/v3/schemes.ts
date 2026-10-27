import type { Theme, Tone } from './types';

/** White or near-black: the two text colours a custom shield picks from. */
export const TEXT_LIGHT = '#ffffff';
export const TEXT_DARK = '#18181b';

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = [...value].map((c) => c + c).join('');
  }
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** `#rgb` or `#rrggbb` in lower case, the long form. */
export const normalizeHex = (hex: string) => toHex(parseHex(hex));

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The text colour with the higher contrast on `background`: white or near-black. */
export const textOn = (background: string) =>
  contrast(TEXT_LIGHT, background) >= contrast(TEXT_DARK, background) ? TEXT_LIGHT : TEXT_DARK;

/** `from` moved `share` (0–1) of the way to `to`. */
export function mix(from: string, to: string, share: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex({ r: a.r + (b.r - a.r) * share, g: a.g + (b.g - a.g) * share, b: a.b + (b.b - a.b) * share });
}

/** `#rrggbb` at an opacity, as `rgba()`. */
export function alpha(hex: string, opacity: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** The podium mark's two colours. */
export type MarkColors = { podium: string; star: string };

export const MARK_VIOLET: MarkColors = { podium: '#a684ff', star: '#ffb900' };
export const MARK_WHITE: MarkColors = { podium: '#ffffff', star: '#ffd166' };
export const MARK_DEEP: MarkColors = { podium: '#7f22fe', star: '#f59e0b' };

/**
 * The mark follows the label text, so the two never disagree: on white label text, violet when it holds 3:1 on the
 * ground, else white; on dark label text, the deep violet.
 */
export function markOn(background: string, labelText: string): MarkColors {
  if (labelText === TEXT_DARK || luminance(labelText) < 0.5) {
    return MARK_DEEP;
  }
  return contrast(MARK_VIOLET.podium, background) >= 3 ? MARK_VIOLET : MARK_WHITE;
}

/**
 * Developer and repository tiers share their seven colours: on light grounds, on dark ones, and pale tones for a
 * saturated colour ground (Violet, Classic).
 */
const TIER_COLORS: Record<Ground, readonly string[]> = {
  light: ['#52525c', '#008236', '#00786f', '#1447e6', '#7008e7', '#c70036', '#bb4d00'],
  dark: ['#9f9fa9', '#05df72', '#00d5be', '#51a2ff', '#a684ff', '#ff637e', '#ffb900'],
  color: ['#e4e4e7', '#b9f8cf', '#96f7e4', '#bedbff', '#ddd6ff', '#ffccd3', '#fee685'],
};

/** Where tones are read from: a light or a dark neutral ground, or a saturated colour with white text. */
export type Ground = 'light' | 'dark' | 'color';

export const tierColor = (tier: number, ground: Ground) => TIER_COLORS[ground][Math.min(7, Math.max(1, tier)) - 1];

/** The Tier scheme's value fills: each tier's colour, deep enough for white text at 4.5:1. */
export const TIER_FILLS = ['#52525c', '#008236', '#00786f', '#1447e6', '#7008e7', '#c70036', '#b45309'] as const;

const POSITIVE: Record<Ground, string> = { light: '#008236', dark: '#05df72', color: '#b9f8cf' };
const GOLD: Record<Ground, string> = { light: '#bb4d00', dark: '#ffb900', color: '#ffd166' };

/** The colour of a tone on a ground; `fallback` for plain text. */
export function toneColor(tone: Tone | undefined, ground: Ground, fallback: string): string {
  if (!tone) return fallback;
  if (tone === 'positive') return POSITIVE[ground];
  if (tone === 'gold') return GOLD[ground];
  return tierColor(tone.tier, ground);
}

/**
 * A tone's colour where it holds 3:1 on the block, else the block's own text colour: a green gain stays green on
 * Night but turns pale on Classic's blue. Colours that are not plain hex are taken as they are.
 */
export function readableOn(color: string, background: string, fallback: string): string {
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(background) || !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
    return color;
  }
  return contrast(color, background) >= 3 ? color : fallback;
}

export type Block = { background: string; text: string };

/**
 * A shield is two blocks: the label, and the value with its extra after " · " in a muted tone (board 9).
 */
export type ShieldPalette = {
  label: Block;
  value: Block;
  /** The extra's text inside the value block. */
  muted: string;
  /** Where tones are taken from: the value's ground. */
  ground: Ground;
  mark: MarkColors;
  /** A 1px line around the whole badge. */
  edge?: string;
  /** The value is filled with its tier's colour: tier tones there are plain text. */
  tierFill?: boolean;
};

/** The marks of the neutral drawings: deep violet on light, light violet on dark. */
export const MARK_LIGHT: MarkColors = { podium: '#7c3aed', star: '#d97706' };
export const MARK_NIGHT: MarkColors = { podium: '#c4b5fd', star: '#ffb900' };
/** The mark on the zinc label of Violet and Tier. */
export const MARK_LILAC: MarkColors = { podium: '#ddd6fe', star: '#ffd166' };

/** Night: a grey label, a near-black value, an edge that holds on a dark page. Auto's dark drawing. */
export const NIGHT_SHIELD: ShieldPalette = {
  label: { background: '#3f3f46', text: '#e4e4e7' },
  value: { background: '#212830', text: '#f0f6fc' },
  muted: '#9198a1',
  ground: 'dark',
  mark: MARK_NIGHT,
  edge: '#3d444d',
};

/** Auto (the default) follows the reader's theme: a neutral light drawing, and Night as the dark one. */
export const AUTO_SHIELD: Record<Theme, ShieldPalette> = {
  light: {
    label: { background: '#e4e4e7', text: '#3f3f46' },
    value: { background: '#fafafa', text: TEXT_DARK },
    muted: '#71717a',
    ground: 'light',
    mark: MARK_LIGHT,
    edge: '#d4d4d8',
  },
  dark: NIGHT_SHIELD,
};

const ZINC_LABEL: Block = { background: '#52525b', text: '#fafafa' };

export const VIOLET_SHIELD: ShieldPalette = {
  label: ZINC_LABEL,
  value: { background: '#6d28d9', text: TEXT_LIGHT },
  muted: '#ddd6fe',
  ground: 'color',
  mark: MARK_LILAC,
};

/** The old badge's colours in the new shape. */
export const CLASSIC_SHIELD: ShieldPalette = {
  label: { background: '#5c5c5c', text: TEXT_LIGHT },
  value: { background: '#2282c2', text: TEXT_LIGHT },
  muted: mix(TEXT_LIGHT, '#2282c2', 0.25),
  ground: 'color',
  mark: markOn('#5c5c5c', TEXT_LIGHT),
};

/** Tier: the value filled with the badge's tier colour, white text; a neutral fill where there is no tier. */
export function tierPalette(tier: number | null): ShieldPalette {
  const fill = tier ? TIER_FILLS[Math.min(7, Math.max(1, tier)) - 1] : '#3f3f46';
  return {
    label: ZINC_LABEL,
    value: { background: fill, text: TEXT_LIGHT },
    muted: mix(TEXT_LIGHT, fill, 0.2),
    ground: 'color',
    mark: MARK_LILAC,
    tierFill: true,
  };
}

/** The extra's muted tone: the value's text a quarter of the way to the value's ground. */
export const mutedOn = (background: string, text: string) => mix(text, background, 0.25);

/** Two picked colours: each block's text by contrast, the extra muted from the value's text. */
export function pickedPalette(leftHex: string, rightHex: string): ShieldPalette {
  const left = normalizeHex(leftHex);
  const right = normalizeHex(rightHex);
  const leftText = textOn(left);
  const rightText = textOn(right);
  return {
    label: { background: left, text: leftText },
    value: { background: right, text: rightText },
    muted: mutedOn(right, rightText),
    ground: luminance(rightText) > 0.5 ? 'dark' : 'light',
    mark: markOn(left, leftText),
  };
}

export type CardPalette = {
  background: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  /** The empty part of a bar, and chart gridlines. */
  track: string;
  ground: Ground;
  mark: MarkColors;
  /** An avatar that could not be fetched. */
  placeholder: string;
  /** The ring around a tier badge on an avatar: the card's own ground, opaque. */
  ring: string;
};

/** Auto cards, in the same greys as Auto shields. */
export const AUTO_CARD: Record<Theme, CardPalette> = {
  light: {
    background: '#ffffff',
    border: '#d4d4d8',
    text: TEXT_DARK,
    muted: '#71717a',
    accent: '#7c3aed',
    track: '#e4e4e7',
    ground: 'light',
    mark: MARK_LIGHT,
    placeholder: '#d4d4d8',
    ring: '#ffffff',
  },
  dark: {
    background: '#212830',
    border: '#3d444d',
    text: '#f0f6fc',
    muted: '#9198a1',
    accent: '#c4b5fd',
    track: '#3f3f46',
    ground: 'dark',
    mark: MARK_NIGHT,
    placeholder: '#3f3f46',
    ring: '#212830',
  },
};

/** Night cards are Auto's dark drawing alone. */
export const NIGHT_CARD: CardPalette = AUTO_CARD.dark;

function colorCard(background: string, border: string, mark: MarkColors, muted: string): CardPalette {
  return {
    background,
    border,
    text: TEXT_LIGHT,
    muted,
    accent: TEXT_LIGHT,
    track: mix(background, TEXT_LIGHT, 0.25),
    ground: 'color',
    mark,
    placeholder: mix(background, TEXT_LIGHT, 0.3),
    ring: background,
  };
}

export const VIOLET_CARD: CardPalette = colorCard('#6d28d9', '#52525b', MARK_LILAC, '#ddd6fe');
export const CLASSIC_CARD: CardPalette = colorCard('#2282c2', '#5c5c5c', CLASSIC_SHIELD.mark, CLASSIC_SHIELD.muted);
