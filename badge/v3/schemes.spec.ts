import { describe, expect, it } from 'vitest';

import {
  AUTO_SHIELD,
  contrast,
  MARK_DEEP,
  MARK_VIOLET,
  MARK_WHITE,
  markOn,
  mix,
  mutedOn,
  NIGHT_SHIELD,
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
  it('Night: a grey label, a near-black value with a muted extra, the light violet mark and an edge', () => {
    const night = presetPalette('night');
    expect(night).toEqual(NIGHT_SHIELD);
    expect(night.label).toEqual({ background: '#3f3f46', text: '#e4e4e7' });
    expect(night.value).toEqual({ background: '#212830', text: '#f0f6fc' });
    expect(night.muted).toBe('#9198a1');
    expect(night.edge).toBe('#3d444d');
    expect(night.mark).toEqual({ podium: '#c4b5fd', star: '#ffb900' });
    expect(night.ground).toBe('dark');
  });

  it('edges Night and Auto only', () => {
    expect(presetPalette('classic').edge).toBeUndefined();
    expect(presetPalette('violet').edge).toBeUndefined();
    expect(pickedPalette('#3f3f46', '#212830').edge).toBeUndefined();
    expect(TINT_SHIELD.edge).toBeUndefined();
  });

  it("Classic: today's colours with white text, a muted extra from it, and the white mark", () => {
    const classic = presetPalette('classic');
    expect(classic.label).toEqual({ background: '#5c5c5c', text: TEXT_LIGHT });
    expect(classic.value).toEqual({ background: '#2282c2', text: TEXT_LIGHT });
    expect(classic.muted).toBe(mutedOn('#2282c2', TEXT_LIGHT));
    expect(classic.muted).toBe(mix(TEXT_LIGHT, '#2282c2', 0.25));
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
    expect(violet.muted).toBe(mutedOn('#f5f3ff', TEXT_DARK));
  });

  it('keeps every muted extra readable on its value block', () => {
    for (const palette of [
      NIGHT_SHIELD,
      presetPalette('classic'),
      presetPalette('violet'),
      pickedPalette('#334155', '#0f766e'),
      pickedPalette('#cbd5e1', '#fde68a'),
      AUTO_SHIELD.light,
      AUTO_SHIELD.dark,
    ]) {
      expect(contrast(palette.muted, palette.value.background)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('picked colours', () => {
  it('takes each block by contrast and mutes the extra from the value text', () => {
    const palette = pickedPalette('#0f766e', '#ccfbf1');
    expect(palette.label.text).toBe(TEXT_LIGHT);
    expect(palette.value.text).toBe(TEXT_DARK);
    expect(palette.muted).toBe(mix(TEXT_DARK, '#ccfbf1', 0.25));
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
    expect(AUTO_SHIELD.light).toMatchObject({ edge: '#e4e4e7', mark: MARK_DEEP, ground: 'light' });
    expect(AUTO_SHIELD.dark).toMatchObject({ edge: '#30363d', mark: MARK_VIOLET, ground: 'dark' });
    expect(AUTO_SHIELD.dark.label.background).toBe('#21262d');
    expect(AUTO_SHIELD.dark.value.background).toBe('#161b22');
  });

  it('draws Tint as translucent washes, one drawing for every page', () => {
    expect(TINT_SHIELD.label.background).toBe('rgba(113, 113, 122, 0.14)');
    expect(TINT_SHIELD.value.background).toBe('rgba(139, 92, 246, 0.14)');
    expect(TINT_SHIELD.muted).toBe('#8b5cf6');
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
