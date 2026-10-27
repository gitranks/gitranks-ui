import { describe, expect, it } from 'vitest';

import {
  AUTO_CARD,
  AUTO_SHIELD,
  CLASSIC_SHIELD,
  contrast,
  MARK_DEEP,
  MARK_LIGHT,
  MARK_LILAC,
  MARK_NIGHT,
  MARK_VIOLET,
  MARK_WHITE,
  markOn,
  mix,
  mutedOn,
  NIGHT_CARD,
  NIGHT_SHIELD,
  pickedPalette,
  readableOn,
  TEXT_DARK,
  TEXT_LIGHT,
  TIER_FILLS,
  textOn,
  tierPalette,
  toneColor,
  VIOLET_SHIELD,
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

describe('Auto, the default', () => {
  it('draws the light drawing in neutral greys with a deep violet mark', () => {
    expect(AUTO_SHIELD.light).toEqual({
      label: { background: '#e4e4e7', text: '#3f3f46' },
      value: { background: '#fafafa', text: TEXT_DARK },
      muted: '#71717a',
      ground: 'light',
      mark: MARK_LIGHT,
      edge: '#d4d4d8',
    });
    expect(MARK_LIGHT).toEqual({ podium: '#7c3aed', star: '#d97706' });
  });

  it('draws Night as its dark drawing', () => {
    expect(AUTO_SHIELD.dark).toBe(NIGHT_SHIELD);
  });

  it('reads tier tones from each drawing: the light tone on light, the dark-theme tone on dark', () => {
    const legend = { tier: 7 };
    const light = toneColor(legend, AUTO_SHIELD.light.ground, TEXT_DARK);
    const dark = toneColor(legend, AUTO_SHIELD.dark.ground, TEXT_LIGHT);
    expect([light, dark]).toEqual(['#bb4d00', '#ffb900']);
    expect(readableOn(light, AUTO_SHIELD.light.value.background, TEXT_DARK)).toBe(light);
    expect(readableOn(dark, AUTO_SHIELD.dark.value.background, TEXT_LIGHT)).toBe(dark);
  });

  it('draws Auto cards in the same greys', () => {
    expect(AUTO_CARD.dark.background).toBe(NIGHT_SHIELD.value.background);
    expect(AUTO_CARD.dark.border).toBe(NIGHT_SHIELD.edge);
    expect(AUTO_CARD.dark.muted).toBe(NIGHT_SHIELD.muted);
    expect(AUTO_CARD.dark.mark).toEqual(MARK_NIGHT);
    expect(AUTO_CARD.light.border).toBe(AUTO_SHIELD.light.edge);
    expect(AUTO_CARD.light.muted).toBe(AUTO_SHIELD.light.muted);
    expect(AUTO_CARD.light.mark).toEqual(MARK_LIGHT);
    expect(NIGHT_CARD).toBe(AUTO_CARD.dark);
  });
});

describe('fixed schemes', () => {
  it('Night: a grey label, a near-black value with a muted extra, the light violet mark and an edge', () => {
    expect(NIGHT_SHIELD.label).toEqual({ background: '#3f3f46', text: '#e4e4e7' });
    expect(NIGHT_SHIELD.value).toEqual({ background: '#212830', text: '#f0f6fc' });
    expect(NIGHT_SHIELD.muted).toBe('#9198a1');
    expect(NIGHT_SHIELD.edge).toBe('#3d444d');
    expect(NIGHT_SHIELD.mark).toEqual({ podium: '#c4b5fd', star: '#ffb900' });
  });

  it('Violet: a zinc label, a deep violet value with white text, the lilac mark', () => {
    expect(VIOLET_SHIELD.label).toEqual({ background: '#52525b', text: '#fafafa' });
    expect(VIOLET_SHIELD.value).toEqual({ background: '#6d28d9', text: TEXT_LIGHT });
    expect(VIOLET_SHIELD.muted).toBe('#ddd6fe');
    expect(VIOLET_SHIELD.mark).toEqual(MARK_LILAC);
    expect(MARK_LILAC).toEqual({ podium: '#ddd6fe', star: '#ffd166' });
  });

  it("Classic: today's colours with white text and the white mark", () => {
    expect(CLASSIC_SHIELD.label).toEqual({ background: '#5c5c5c', text: TEXT_LIGHT });
    expect(CLASSIC_SHIELD.value).toEqual({ background: '#2282c2', text: TEXT_LIGHT });
    expect(CLASSIC_SHIELD.muted).toBe(mix(TEXT_LIGHT, '#2282c2', 0.25));
    // #a684ff is under 3:1 on #5c5c5c.
    expect(CLASSIC_SHIELD.mark).toEqual(MARK_WHITE);
  });

  it('Tier: the value filled with the tier colour, white text at 4.5:1 or more', () => {
    for (let tier = 1; tier <= 7; tier++) {
      const palette = tierPalette(tier);
      expect(palette.value).toEqual({ background: TIER_FILLS[tier - 1], text: TEXT_LIGHT });
      expect(contrast(TEXT_LIGHT, palette.value.background)).toBeGreaterThanOrEqual(4.5);
      expect(palette).toMatchObject({
        label: { background: '#52525b', text: '#fafafa' },
        mark: MARK_LILAC,
        tierFill: true,
      });
    }
    expect(tierPalette(null).value.background).toBe('#3f3f46');
  });

  it('edges Night and Auto only', () => {
    expect(VIOLET_SHIELD.edge).toBeUndefined();
    expect(CLASSIC_SHIELD.edge).toBeUndefined();
    expect(tierPalette(7).edge).toBeUndefined();
    expect(pickedPalette('#3f3f46', '#212830').edge).toBeUndefined();
  });

  it('keeps every muted extra readable on its value block', () => {
    for (const palette of [
      NIGHT_SHIELD,
      AUTO_SHIELD.light,
      VIOLET_SHIELD,
      CLASSIC_SHIELD,
      tierPalette(7),
      pickedPalette('#334155', '#0f766e'),
      pickedPalette('#cbd5e1', '#fde68a'),
    ]) {
      expect(contrast(palette.muted, palette.value.background)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('custom colours', () => {
  it('takes each block by contrast and mutes the extra from the value text', () => {
    const palette = pickedPalette('#0f766e', '#ccfbf1');
    expect(palette.label.text).toBe(TEXT_LIGHT);
    expect(palette.value.text).toBe(TEXT_DARK);
    expect(palette.muted).toBe(mutedOn('#ccfbf1', TEXT_DARK));
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

describe('readableOn', () => {
  it('keeps a tone that holds 3:1 and falls back to the text colour otherwise', () => {
    expect(readableOn('#05df72', '#27272a', '#fafafa')).toBe('#05df72');
    expect(readableOn('#05df72', '#2282c2', '#ffffff')).toBe('#ffffff');
    expect(readableOn('#05df72', 'rgba(0, 0, 0, 0.5)', '#ffffff')).toBe('#05df72');
  });
});
