import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { prefixIds } from './auto-svg';
import { type BadgeDefinition, badgesOf } from './catalogue';
import type { EntityFacts } from './facts';
import { NOW, orgBig, repoBig, repoMid, userBig } from './fixtures';
import { resolveParams } from './params';
import { renderBadge, toPng } from './render';
import { MARK_SIZE } from './shield';

// Avatars are never fetched here: every one draws as the grey disk.
vi.mock('./avatars', () => ({
  fetchAvatar: async () => null,
  fetchAvatars: async (urls: unknown[]) => urls.map(() => null),
}));

/**
 * Draws every badge in every scheme, with and without its extra and the logo. With `BADGE_V3_SHOTS` set to a
 * directory, it also writes one sheet per entity, on a light and on a dark page, to look at.
 */
const SHOTS = process.env.BADGE_V3_SHOTS;

const PANEL_SCHEMES = [
  'scheme=auto&theme=light',
  'scheme=auto&theme=dark',
  'scheme=night',
  'scheme=violet',
  'scheme=classic',
];

/** Every scheme a shield takes; Tier only on tier shields. */
const shieldSchemes = (badge: BadgeDefinition) => [
  ...PANEL_SCHEMES,
  ...(badge.id === 'tier' ? ['scheme=tier'] : []),
  'scheme=custom&left=%230f766e&right=%23ccfbf1',
];

/** The entity each badge is drawn for: the fixture with every fact, as the API will serve them. */
const ENTITIES: EntityFacts[] = [repoBig, userBig, orgBig];

/** Extra variants of a shield: its default, none, and every other extra it allows. */
function extrasOf(badge: BadgeDefinition): string[] {
  // A contributors shield refuses its value (12mo by default) as its extra.
  const others = badge.extras.filter((extra) => extra !== badge.defaultExtra && !(badge.values && extra === '12mo'));
  return ['', 'extra=none', ...others.map((extra) => `extra=${extra}`)];
}

const VARIANT_QUERY: Record<string, string> = {
  'repo language-rank': '',
  'user rank': 'scope=country',
};

function variantsOf(badge: BadgeDefinition): string[] {
  const base = VARIANT_QUERY[`${badge.entity} ${badge.id}`] ?? '';
  const schemes = badge.format === 'shield' ? shieldSchemes(badge) : PANEL_SCHEMES;
  const extras = badge.format === 'shield' ? extrasOf(badge) : [''];
  const variants: string[] = [];
  for (const scheme of schemes) {
    for (const extra of extras) {
      for (const logo of ['', 'logo=0']) {
        variants.push([base, scheme, extra, logo].filter(Boolean).join('&'));
      }
    }
  }
  return variants;
}

const sizeOf = (svg: string) => {
  const open = /^<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
  const read = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(open)?.[1] ?? 0);
  return { width: read('width'), height: read('height') };
};

const pngSize = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

type Shot = { query: string; svg: string };

/** One sheet: the drawings stacked with their query above each, on a page colour. */
function sheet(shots: Shot[], page: 'light' | 'dark'): string {
  const background = page === 'light' ? '#ffffff' : '#0d1117';
  const ink = page === 'light' ? '#65656f' : '#9f9fa9';
  const padding = 16;
  let y = padding;
  let width = 0;
  const parts: string[] = [];
  for (const [index, { query, svg }] of shots.entries()) {
    const size = sizeOf(svg);
    // One document holds every drawing: their ids must not meet.
    const inner = prefixIds(svg, `s${index}-`)
      .replace(/^<svg\b[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    parts.push(
      `<text x="${padding}" y="${y + 10}" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="${ink}">${query
        .replaceAll('&', ' · ')
        .replaceAll('%23', '#')}</text>`,
    );
    y += 14;
    parts.push(`<svg x="${padding}" y="${y}" width="${size.width}" height="${size.height}">${inner}</svg>`);
    y += size.height + 12;
    width = Math.max(width, size.width + 2 * padding, 360);
  }
  return `<svg width="${width}" height="${y + padding}" viewBox="0 0 ${width} ${y + padding}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${background}"/>${parts.join('')}</svg>`;
}

async function writeSheet(name: string, shots: Shot[], page: 'light' | 'dark') {
  if (!SHOTS) return;
  const { Resvg } = await import('@resvg/resvg-js');
  const png = new Resvg(sheet(shots, page), { fitTo: { mode: 'zoom', value: 2 }, font: { loadSystemFonts: true } })
    .render()
    .asPng();
  await mkdir(SHOTS, { recursive: true });
  await writeFile(path.join(SHOTS, `${name}-${page}.png`), png);
}

describe.each(ENTITIES.map((entity) => [entity.kind, entity] as const))('%s badges', (kind, entity) => {
  // The developer wall is hidden for now: it draws "not yet" (tested below).
  const badges = badgesOf(kind).filter(
    ({ id, entity: owner }) => id !== 'star-history' && !(owner === 'user' && id === 'contributors-wall'),
  );

  it.each(badges.map((badge) => [badge.id, badge] as const))(
    '%s draws in every scheme, with and without its extra and the logo',
    async (id, badge) => {
      const light: Shot[] = [];
      const dark: Shot[] = [];
      for (const query of variantsOf(badge)) {
        const params = resolveParams(badge, new URLSearchParams(query));
        const { body, state } = await renderBadge(entity, badge, params, 'svg', NOW);
        const svg = body as string;
        expect(state, query).toBe('badge');
        expect(svg, query).toMatch(/^<svg width="[\d.]+" height="[\d.]+" viewBox="0 0 [\d.]+ [\d.]+"/);
        expect(svg.endsWith('</svg>'), query).toBe(true);
        // Text is drawn as paths: the image reads the same without the fonts.
        expect(svg, query).not.toContain('<text');
        if (badge.format === 'shield') {
          expect(sizeOf(svg).height, query).toBe(20);
        } else if (badge.size) {
          expect(sizeOf(svg), query).toEqual(badge.size);
        }
        // Auto pages show their own theme; the rest look the same on both.
        if (!query.includes('theme=dark')) light.push({ query, svg });
        if (!query.includes('theme=light')) dark.push({ query, svg });
      }
      await writeSheet(`${kind}-${id}`, light, 'light');
      await writeSheet(`${kind}-${id}`, dark, 'dark');
    },
  );

  it.each(badges.filter(({ format }) => format === 'shield').map((badge) => [badge.id, badge] as const))(
    '%s: the logo switch closes up the label',
    async (_, badge) => {
      const draw = async (query: string) =>
        sizeOf(
          (await renderBadge(entity, badge, resolveParams(badge, new URLSearchParams(query)), 'svg', NOW))
            .body as string,
        ).width;
      expect((await draw('')) - (await draw('logo=0'))).toBeCloseTo(MARK_SIZE + 4, 0);
    },
  );

  it.each(badges.filter(({ format }) => format !== 'shield').map((badge) => [badge.id, badge] as const))(
    '%s: the logo switch removes the mark',
    async (_, badge) => {
      const draw = async (query: string) =>
        (await renderBadge(entity, badge, resolveParams(badge, new URLSearchParams(query)), 'svg', NOW)).body as string;
      expect(await draw('theme=light&logo=0')).not.toBe(await draw('theme=light'));
    },
  );
});

describe('the developer wall', () => {
  it('draws "not yet" while it is hidden', async () => {
    const wall = badgesOf('user').find(({ id }) => id === 'contributors-wall')!;
    const { state } = await renderBadge(userBig, wall, resolveParams(wall, new URLSearchParams()), 'svg', NOW);
    expect(state).toBe('not-yet');
  });
});

describe('PNG', () => {
  it('draws one drawing at 2×, light unless asked for dark', async () => {
    const [badge] = badgesOf('repo');
    const auto = resolveParams(badge, new URLSearchParams('scheme=auto'));
    const light = await renderBadge(repoMid, badge, auto, 'png', NOW);
    const dark = await renderBadge(repoMid, badge, { ...auto, theme: 'dark' }, 'png', NOW);
    const svg = (await renderBadge(repoMid, badge, { ...auto, theme: 'light' }, 'svg', NOW)).body as string;

    expect(light.contentType).toBe('image/png');
    expect(pngSize(light.body as Uint8Array)).toEqual({ width: sizeOf(svg).width * 2, height: 40 });
    expect(light.body).toEqual(await toPng(svg));
    expect(dark.body).not.toEqual(light.body);
  });

  it('draws a card for social sharing at 1200×630', async () => {
    const card = badgesOf('repo').find(({ id }) => id === 'rank-card')!;
    const params = resolveParams(card, new URLSearchParams('size=social'));
    const { body } = await renderBadge(repoMid, card, params, 'png', NOW);

    expect(pngSize(body as Uint8Array)).toEqual({ width: 1200, height: 630 });
  });
});
