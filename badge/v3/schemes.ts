import type { Preset, Theme, Tone } from './types';

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

/** Developer and repository tiers share their seven colours: on light grounds, on dark ones, and mid-tones for Tint. */
const TIER_COLORS: Record<'light' | 'dark' | 'mid', readonly string[]> = {
  light: ['#52525c', '#008236', '#00786f', '#1447e6', '#7008e7', '#c70036', '#bb4d00'],
  dark: ['#9f9fa9', '#05df72', '#00d5be', '#51a2ff', '#a684ff', '#ff637e', '#ffb900'],
  mid: ['#71717b', '#00a63e', '#009689', '#155dfc', '#7f22fe', '#ec003f', '#e17100'],
};

export type Ground = 'light' | 'dark' | 'mid';

export const tierColor = (tier: number, ground: Ground) => TIER_COLORS[ground][Math.min(7, Math.max(1, tier)) - 1];

const POSITIVE: Record<Ground, string> = { light: '#008236', dark: '#05df72', mid: '#00a63e' };
const GOLD: Record<Ground, string> = { light: '#bb4d00', dark: '#ffb900', mid: '#e17100' };

/** The colour of a tone on a ground; `fallback` for plain text. */
export function toneColor(tone: Tone | undefined, ground: Ground, fallback: string): string {
  if (!tone) return fallback;
  if (tone === 'positive') return POSITIVE[ground];
  if (tone === 'gold') return GOLD[ground];
  return tierColor(tone.tier, ground);
}

/**
 * A tone's colour where it holds 3:1 on the block, else the block's own text colour: a green gain stays green on
 * Night but turns white on Classic's blue. Translucent grounds (Tint) are taken as they are.
 */
export function readableOn(color: string, background: string, fallback: string): string {
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(background) || !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
    return color;
  }
  return contrast(color, background) >= 3 ? color : fallback;
}

export type Block = { background: string; text: string };

/**
 * A shield is two blocks: the label, and the value with its extra after " · " in a muted tone (spec board 9).
 */
export type ShieldPalette = {
  label: Block;
  value: Block;
  /** The extra's text inside the value block. */
  muted: string;
  /** Where tones are taken from: the value's ground. */
  ground: Ground;
  mark: MarkColors;
  /** A 1px line around the whole badge: Night's edge and Auto's hairline. */
  edge?: string;
};

/** Night's own mark: a light violet that holds on its grey label. */
export const MARK_NIGHT: MarkColors = { podium: '#c4b5fd', star: '#ffb900' };

/** The default preset, set by the design: a grey label, a near-black value, an edge that holds on a dark page. */
export const NIGHT_SHIELD: ShieldPalette = {
  label: { background: '#3f3f46', text: '#e4e4e7' },
  value: { background: '#212830', text: '#f0f6fc' },
  muted: '#9198a1',
  ground: 'dark',
  mark: MARK_NIGHT,
  edge: '#3d444d',
};

type CustomPreset = { left: string; right: string; leftText: string; rightText: string };

/** Classic is the old badge's colours in the new shape; text colours are the designs'. */
export const PRESETS: Record<Exclude<Preset, 'night'>, CustomPreset> = {
  classic: { left: '#5c5c5c', right: '#2282c2', leftText: TEXT_LIGHT, rightText: TEXT_LIGHT },
  violet: { left: '#7f22fe', right: '#f5f3ff', leftText: TEXT_LIGHT, rightText: TEXT_DARK },
};

/** The extra's muted tone: the value's text a quarter of the way to the value's ground. */
export const mutedOn = (background: string, text: string) => mix(text, background, 0.25);

function customPalette(left: string, right: string, leftText: string, rightText: string): ShieldPalette {
  return {
    label: { background: left, text: leftText },
    value: { background: right, text: rightText },
    muted: mutedOn(right, rightText),
    ground: luminance(rightText) > 0.5 ? 'dark' : 'light',
    mark: markOn(left, leftText),
  };
}

export function presetPalette(preset: Preset): ShieldPalette {
  if (preset === 'night') return NIGHT_SHIELD;
  const { left, right, leftText, rightText } = PRESETS[preset];
  return customPalette(left, right, leftText, rightText);
}

/** Two picked colours: each block's text by contrast, the extra muted from the value's text. */
export function pickedPalette(leftHex: string, rightHex: string): ShieldPalette {
  const left = normalizeHex(leftHex);
  const right = normalizeHex(rightHex);
  return customPalette(left, right, textOn(left), textOn(right));
}

/** Auto's colours wait for the owner's pick; only the shape follows the new design. */
export const AUTO_SHIELD: Record<Theme, ShieldPalette> = {
  light: {
    label: { background: '#f4f4f5', text: '#3f3f46' },
    value: { background: '#ffffff', text: TEXT_DARK },
    muted: '#65656f',
    ground: 'light',
    mark: MARK_DEEP,
    edge: '#e4e4e7',
  },
  dark: {
    label: { background: '#21262d', text: '#e6edf3' },
    value: { background: '#161b22', text: '#e6edf3' },
    muted: '#9f9fa9',
    ground: 'dark',
    mark: MARK_VIOLET,
    edge: '#30363d',
  },
};

/** One drawing for every page: washes of grey and violet with mid-tone text. */
export const TINT_SHIELD: ShieldPalette = {
  label: { background: alpha('#71717a', 0.14), text: '#71717a' },
  value: { background: alpha('#8b5cf6', 0.14), text: '#8b5cf6' },
  muted: '#8b5cf6',
  ground: 'mid',
  mark: MARK_DEEP,
};

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

export const AUTO_CARD: Record<Theme, CardPalette> = {
  light: {
    background: '#ffffff',
    border: '#e4e4e7',
    text: TEXT_DARK,
    muted: '#65656f',
    accent: '#7f22fe',
    track: '#f4f4f5',
    ground: 'light',
    mark: MARK_DEEP,
    placeholder: '#d4d4d8',
    ring: '#ffffff',
  },
  dark: {
    background: '#161b22',
    border: '#30363d',
    text: '#e6edf3',
    muted: '#9f9fa9',
    accent: '#a684ff',
    track: '#21262d',
    ground: 'dark',
    mark: MARK_VIOLET,
    placeholder: '#3f3f46',
    ring: '#161b22',
  },
};

export const TINT_CARD: CardPalette = {
  background: alpha('#8b5cf6', 0.1),
  border: alpha('#8b5cf6', 0.25),
  text: '#8b5cf6',
  muted: '#8b949e',
  accent: '#8b5cf6',
  track: alpha('#8b5cf6', 0.18),
  ground: 'mid',
  mark: MARK_DEEP,
  placeholder: alpha('#8b949e', 0.35),
  ring: alpha('#8b5cf6', 0.3),
};
