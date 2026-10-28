import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { formatMonthly, renderNotTrackedSvg, renderStarHistorySvg, svgToPng } from './render-star-history-badge';
import type { StarPoint } from './star-history-chart';

const resvgOptions = vi.hoisted(() => [] as unknown[]);
vi.mock('@resvg/resvg-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@resvg/resvg-js')>();
  class Resvg extends actual.Resvg {
    constructor(...args: ConstructorParameters<typeof actual.Resvg>) {
      resvgOptions.push(args[1]);
      super(...args);
    }
  }
  return { ...actual, Resvg };
});

const ROOT = /^<svg width="1000" height="400" viewBox="0 0 1000 400" xmlns="http:\/\/www\.w3\.org\/2000\/svg">/;

/** PNG width and height from the IHDR chunk. */
const pngSize = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

/** A made-up repository growing over six and a half years, for the gallery's example. */
function exampleHistory(): { points: StarPoint[]; current: StarPoint } {
  const points: StarPoint[] = [{ date: '2020-03-14T00:00:00Z', stars: 0 }];
  for (let month = 1; month <= 79; month++) {
    const progress = month / 79;
    points.push({
      date: new Date(Date.UTC(2020, 2 + month, 1)).toISOString(),
      stars: Math.round(5200 * progress ** 1.5 + (month >= 30 ? 900 : 0)),
    });
  }
  return { points, current: { date: '2026-10-20T00:00:00Z', stars: 6214 } };
}

describe('formatMonthly', () => {
  it('shows only a gain', () => {
    expect(formatMonthly(1214)).toBe('+1,214 this month');
    expect(formatMonthly(0)).toBeNull();
    expect(formatMonthly(-3)).toBeNull();
    expect(formatMonthly(null)).toBeNull();
    expect(formatMonthly(undefined)).toBeNull();
  });
});

describe('renderStarHistorySvg', () => {
  it('draws the chart under the text, on a transparent 1000x400 canvas', async () => {
    const svg = await renderStarHistorySvg({
      kind: 'chart',
      nameWithOwner: 'octo/widgets',
      ...exampleHistory(),
      gainedThisMonth: 214,
    });

    expect(svg).toMatch(ROOT);
    expect(svg).toMatch(/^<svg[^>]*><path d="M24 320 L[^"]+ Z" fill="#2f81f7" fill-opacity="0.2"\/>/);
    expect(svg).toContain('stroke="#2f81f7"');
    // Text is drawn as paths: it reads the same without the fonts.
    expect(svg).not.toContain('<text');
    // satori's masks and clip paths hold rects; nothing else may paint a background.
    expect(svg.replace(/<(mask|clipPath)[^>]*>.*?<\/\1>/gs, '')).not.toContain('<rect');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('draws a single point and a long name', async () => {
    const svg = await renderStarHistorySvg({
      kind: 'chart',
      nameWithOwner: `${'a'.repeat(39)}/${'b'.repeat(100)}`,
      points: [],
      current: { date: '2026-10-20T00:00:00Z', stars: 1_234_567 },
      gainedThisMonth: -3,
    });

    expect(svg).toMatch(ROOT);
    expect(svg).toContain('<path d="M24 136 L976 136"');
  });

  it('draws the placeholder at the same size, without a chart', async () => {
    const svg = await renderStarHistorySvg({ kind: 'preparing', nameWithOwner: 'octo/widgets', stars: 42 });

    expect(svg).toMatch(ROOT);
    expect(svg).not.toContain('fill-opacity="0.2"');
  });

  it('makes a 2000x800 PNG', async () => {
    const svg = await renderStarHistorySvg({ kind: 'chart', nameWithOwner: 'octo/widgets', ...exampleHistory() });
    const png = await svgToPng(svg);

    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(pngSize(png)).toEqual({ width: 2000, height: 800 });
  });

  it('skips the system font scan, which satori output never needs', async () => {
    await svgToPng(await renderStarHistorySvg({ kind: 'preparing', nameWithOwner: 'octo/widgets', stars: 42 }));

    expect(resvgOptions.at(-1)).toMatchObject({ font: { loadSystemFonts: false } });
  });
});

describe('static star history images', () => {
  // `vitest -u` writes them again after a change to the drawing.
  it('keeps the not-tracked image in step with the drawing', async () => {
    await expect(await renderNotTrackedSvg()).toMatchFileSnapshot('../../public/badges/repo-not-tracked.svg');
  });

  it('keeps the not-tracked PNG at 2000x800', async () => {
    const png = new Uint8Array(await readFile(path.join(process.cwd(), 'public', 'badges', 'repo-not-tracked.png')));

    expect(pngSize(png)).toEqual({ width: 2000, height: 800 });
  });

  it("keeps the gallery's example in step with the drawing", async () => {
    const svg = await renderStarHistorySvg({
      kind: 'chart',
      nameWithOwner: 'your-name/your-repo',
      ...exampleHistory(),
      gainedThisMonth: 214,
    });

    await expect(svg).toMatchFileSnapshot('../../public/badges/repo-star-history-example.svg');
  });
});
