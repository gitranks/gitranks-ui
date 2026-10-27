import { describe, expect, it } from 'vitest';

import {
  AUTO_SHIELD,
  contrast,
  MARK_DEEP,
  MARK_VIOLET,
  MARK_WHITE,
  NIGHT_EDGE,
  markOn,
  mix,
  pickedPalette,
  presetPalette,
  readableOn,
  TEXT_DARK,
  TEXT_LIGHT,
  TINT_SHIELD,
  textOn,
} from './schemes';

describe('the contrast rule', () => {
  it.each([
    ['#000000', TEXT_LIGHT],
    ['#ffffff', TEXT_DARK],
    ['#0f766e', TEXT_LIGHT],
    ['#ccfbf1', TEXT_DARK],
    ['#ffd166', TEXT_DARK],
  ])('puts the text with more contrast on %s', (background, text) => {
    expect(textOn(background)).toBe(text);
    const other = text === TEXT_LIGHT ? TEXT_DARK : TEXT_LIGHT;
    expect(contrast(text, background)).toBeGreaterThanOrEqual(contrast(other, background));
  });

  it('reads #rgb as #rrggbb', () => {
    expect(textOn('#fff')).toBe(textOn('#ffffff'));
    expect(pickedPalette('#0f7', '#fff').label.background).toBe('#00ff77');
  });
});

describe('presets', () => {
  it('Night: the design colours, a lighter extra block and the violet mark', () => {
    const night = presetPalette('night');
    expect(night.label).toEqual({ background: '#18181b', text: '#fafafa' });
    expect(night.value).toEqual({ background: '#27272a', text: '#fafafa' });
    expect(night.extra).toEqual({ background: '#3f3f46', text: '#d4d4d8' });
    expect(night.mark).toEqual(MARK_VIOLET);
    expect(night.ground).toBe('dark');
  });

  it('edges Night alone in faint white, so it holds on a dark page', () => {
    expect(presetPalette('night').hairline).toBe(NIGHT_EDGE);
    expect(NIGHT_EDGE).toBe('rgba(255, 255, 255, 0.18)');
    expect(presetPalette('classic').hairline).toBeUndefined();
    expect(presetPalette('violet').hairline).toBeUndefined();
    expect(pickedPalette('#18181b', '#27272a').hairline).toBeUndefined();
    expect(TINT_SHIELD.hairline).toBeUndefined();
  });

  it("Classic: today's colours with white text, the extra 8% towards it, and the white mark", () => {
    const classic = presetPalette('classic');
    expect(classic.label).toEqual({ background: '#5c5c5c', text: TEXT_LIGHT });
    expect(classic.value).toEqual({ background: '#2282c2', text: TEXT_LIGHT });
    expect(classic.extra.background).toBe(mix('#2282c2', TEXT_LIGHT, 0.08));
    // #a684ff is under 3:1 on #5c5c5c.
    expect(classic.mark).toEqual(MARK_WHITE);
  });

  it('Violet: the white mark on the violet label, dark text on the pale value', () => {
    const violet = presetPalette('violet');
    expect(violet.label.text).toBe(TEXT_LIGHT);
    expect(violet.value.text).toBe(TEXT_DARK);
    expect(contrast(MARK_VIOLET.podium, '#7f22fe')).toBeLessThan(3);
    expect(violet.mark).toEqual(MARK_WHITE);
    expect(violet.ground).toBe('light');
    expect(violet.extra.text).toBe('#3f3f46');
  });
});

describe('picked colours', () => {
  it('takes each side by contrast and the extra 8% towards the value text', () => {
    const palette = pickedPalette('#0f766e', '#ccfbf1');
    expect(palette.label.text).toBe(TEXT_LIGHT);
    expect(palette.value.text).toBe(TEXT_DARK);
    expect(palette.extra.background).toBe(mix('#ccfbf1', TEXT_DARK, 0.08));
    expect(palette.ground).toBe('light');
  });

  it('gives a dark label the violet mark when it holds 3:1, else the white one', () => {
    expect(pickedPalette('#000000', '#333333').mark).toEqual(MARK_VIOLET);
    expect(pickedPalette('#0f766e', '#ccfbf1').mark).toEqual(MARK_WHITE);
  });

  it('gives a light label the deep violet mark, as its text is dark', () => {
    expect(pickedPalette('#fef3c7', '#1e3a8a').mark).toEqual(MARK_DEEP);
    expect(markOn('#ffffff', TEXT_DARK)).toEqual(MARK_DEEP);
  });
});

describe('Auto and Tint', () => {
  it('draws Auto light and dark with a hairline and the matching mark', () => {
    expect(AUTO_SHIELD.light).toMatchObject({ hairline: '#e4e4e7', mark: MARK_DEEP, ground: 'light' });
    expect(AUTO_SHIELD.dark).toMatchObject({ hairline: '#30363d', mark: MARK_VIOLET, ground: 'dark' });
    expect(AUTO_SHIELD.dark.label.background).toBe('#21262d');
    expect(AUTO_SHIELD.dark.value.background).toBe('#161b22');
    expect(AUTO_SHIELD.dark.extra.background).toBe('#1c2128');
  });

  it('draws Tint as translucent washes, one drawing for every page', () => {
    expect(TINT_SHIELD.label.background).toBe('rgba(113, 113, 122, 0.14)');
    expect(TINT_SHIELD.value.background).toBe('rgba(139, 92, 246, 0.14)');
    expect(TINT_SHIELD.extra.background).toBe('rgba(139, 92, 246, 0.08)');
    expect(TINT_SHIELD.ground).toBe('mid');
  });
});

describe('readableOn', () => {
  it('keeps a tone that holds 3:1 and falls back to the text colour otherwise', () => {
    expect(readableOn('#05df72', '#27272a', '#fafafa')).toBe('#05df72');
    expect(readableOn('#05df72', '#2282c2', '#ffffff')).toBe('#ffffff');
    expect(readableOn('#8b5cf6', 'rgba(139, 92, 246, 0.14)', '#8b5cf6')).toBe('#8b5cf6');
  });
});
