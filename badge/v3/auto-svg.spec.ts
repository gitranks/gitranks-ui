import { describe, expect, it } from 'vitest';

import { AUTO_STYLE, joinAuto, prefixIds, shareImages } from './auto-svg';

const drawing = (fill: string, width = 120) =>
  `<svg width="${width}" height="20" viewBox="0 0 ${width} 20" xmlns="http://www.w3.org/2000/svg">` +
  '<clipPath id="satori_cp-id"><rect width="10" height="10"/></clipPath>' +
  '<mask id="satori_om-id-0"><rect fill="#fff"/></mask>' +
  `<g clip-path="url(#satori_cp-id)" mask="url(#satori_om-id-0)"><rect fill="${fill}"/></g>` +
  '<use href="#satori_cp-id"/><use xlink:href="#satori_cp-id"/>' +
  '<image href="data:image/svg+xml;base64,PHN2ZyBpZD0ieCIvPg=="/>' +
  '</svg>';

describe('prefixIds', () => {
  it('prefixes every id and every reference to one', () => {
    const svg = prefixIds(drawing('#000'), 'l-');

    expect(svg).toContain('id="l-satori_cp-id"');
    expect(svg).toContain('id="l-satori_om-id-0"');
    expect(svg).toContain('clip-path="url(#l-satori_cp-id)"');
    expect(svg).toContain('mask="url(#l-satori_om-id-0)"');
    expect(svg).toContain('<use href="#l-satori_cp-id"/>');
    expect(svg).toContain('<use xlink:href="#l-satori_cp-id"/>');
    expect(svg).not.toMatch(/id="satori|url\(#satori|href="#satori/);
  });

  it('leaves embedded images alone', () => {
    expect(prefixIds(drawing('#000'), 'l-')).toContain('data:image/svg+xml;base64,PHN2ZyBpZD0ieCIvPg==');
  });
});

describe('joinAuto', () => {
  const joined = joinAuto(drawing('#fff'), drawing('#000'));

  it('holds both drawings, light then dark, under the media query', () => {
    expect(
      joined.startsWith('<svg width="120" height="20" viewBox="0 0 120 20" xmlns="http://www.w3.org/2000/svg">'),
    ).toBe(true);
    expect(joined).toContain(AUTO_STYLE);
    expect(AUTO_STYLE).toBe(
      '<style>.d{display:none}@media (prefers-color-scheme: dark){.l{display:none}.d{display:inline}}</style>',
    );
    const light = joined.indexOf('<g class="l">');
    const dark = joined.indexOf('<g class="d">');
    expect(light).toBeGreaterThan(0);
    expect(dark).toBeGreaterThan(light);
    expect(joined.slice(light, dark)).toContain('fill="#fff"');
    expect(joined.slice(dark)).toContain('fill="#000"');
    expect(joined.endsWith('</g></svg>')).toBe(true);
  });

  it('keeps the two drawings apart: no id is defined twice', () => {
    const ids = [...joined.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['l-satori_cp-id', 'l-satori_om-id-0', 'd-satori_cp-id', 'd-satori_om-id-0']);
  });

  it('takes the larger size when the drawings differ', () => {
    expect(joinAuto(drawing('#fff', 100), drawing('#000', 104))).toMatch(/^<svg width="104" height="20"/);
  });

  it('refuses something that is not one drawing', () => {
    expect(() => joinAuto('<g/>', drawing('#000'))).toThrow();
  });
});

describe('shareImages', () => {
  const avatar = 'data:image/png;base64,QUJD';
  const image = (x: number, href = avatar) =>
    `<image x="${x}" y="4" width="36" height="36" href="${href}" preserveAspectRatio="none" clip-path="url(#c${x})" mask="url(#m${x})"/>`;
  const svg = (body: string) =>
    `<svg width="100" height="50" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  it('embeds a repeated image once and places it with <use>, keeping its clip and mask', () => {
    const shared = shareImages(svg(image(1) + image(50)));

    expect(shared.split(avatar)).toHaveLength(2);
    expect(shared).toContain(
      `<defs><image id="img-0" width="36" height="36" href="${avatar}" preserveAspectRatio="none"/></defs>`,
    );
    expect(shared).toContain('<g clip-path="url(#c1)" mask="url(#m1)"><use href="#img-0" x="1" y="4"/></g>');
    expect(shared).toContain('<g clip-path="url(#c50)" mask="url(#m50)"><use href="#img-0" x="50" y="4"/></g>');
  });

  it('leaves an image drawn once alone', () => {
    const once = svg(image(1) + image(50, 'data:image/png;base64,REVG'));
    expect(shareImages(once)).toBe(once);
  });

  it('embeds an avatar once across both Auto drawings', () => {
    const joined = joinAuto(svg(image(1)), svg(image(1)));
    expect(joined.split(avatar)).toHaveLength(2);
    expect(joined.match(/<use href="#img-0"/g)).toHaveLength(2);
  });
});
