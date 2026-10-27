import type { ReactElement } from 'react';
import satori from 'satori';

import { joinAuto, shareImages } from './auto-svg';
import { type Drawing, notYetDrawing, prepareDrawing } from './cards';
import type { BadgeDefinition } from './catalogue';
import type { EntityFacts } from './facts';
import type { BadgeParams } from './params';
import {
  AUTO_CARD,
  AUTO_SHIELD,
  type CardPalette,
  CLASSIC_CARD,
  CLASSIC_SHIELD,
  NIGHT_CARD,
  NIGHT_SHIELD,
  pickedPalette,
  type ShieldPalette,
  tierPalette,
  VIOLET_CARD,
  VIOLET_SHIELD,
} from './schemes';
import { SHIELD_HEIGHT, Shield } from './shield';
import { notYetShield, shieldContent } from './shields';
import type { ImageFormat, ShieldContent, Theme } from './types';
import {
  CONTENT_TYPE,
  renderStarHistorySvg,
  type StarHistoryBadgeInput,
  svgToPng,
} from '@/badge/repo/render-star-history-badge';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';

/** What an image shows: the badge, "not yet" (it never applied), or star history still being prepared. */
export type RenderState = 'badge' | 'not-yet' | 'preparing';

export type RenderedBadge = { state: RenderState; body: string | Uint8Array<ArrayBuffer>; contentType: string };

/** og:image size for cards (spec §9). */
export const SOCIAL_SIZE = { width: 1200, height: 630 } as const;

const FONTS = [
  { weight: 400 as const },
  { weight: 600 as const },
  { weight: 700 as const },
  { name: 'JetBrains Mono' as const, weight: 700 as const },
];

async function toSvg(node: ReactElement, size: { width?: number; height: number }) {
  return satori(node, await getSatoriConfig({ fontOptions: FONTS, ...size }));
}

/** The shield palette for the params; Auto takes the theme it is drawn in, Tier the tier the shield shows. */
function shieldPalette(params: BadgeParams, theme: Theme, content: ShieldContent): ShieldPalette {
  switch (params.scheme) {
    case 'auto':
      return AUTO_SHIELD[theme];
    case 'night':
      return NIGHT_SHIELD;
    case 'violet':
      return VIOLET_SHIELD;
    case 'classic':
      return CLASSIC_SHIELD;
    case 'tier':
      return tierPalette(content.value.icon?.tier ?? null);
    case 'custom':
      return params.colors ? pickedPalette(params.colors.left, params.colors.right) : NIGHT_SHIELD;
  }
}

const CARD_PALETTES: Record<'night' | 'violet' | 'classic', CardPalette> = {
  night: NIGHT_CARD,
  violet: VIOLET_CARD,
  classic: CLASSIC_CARD,
};

const cardPalette = (params: BadgeParams, theme: Theme): CardPalette =>
  params.scheme === 'night' || params.scheme === 'violet' || params.scheme === 'classic'
    ? CARD_PALETTES[params.scheme]
    : AUTO_CARD[theme];

/** The themes to draw: both for an Auto SVG without `theme`, else one (light unless asked for dark). */
function themesOf(params: BadgeParams, format: ImageFormat): Theme[] {
  if (params.scheme === 'auto' && !params.theme && format === 'svg') {
    return ['light', 'dark'];
  }
  return [params.theme ?? 'light'];
}

const PAGE_BACKGROUND: Record<Theme, string> = { light: '#fafafa', dark: '#0d1117' };

/** A card centred on a 1200×630 page, for og:image. */
function socialWrap(svg: string, drawing: Drawing, theme: Theme): string {
  const { width, height } = SOCIAL_SIZE;
  const scale = Math.min((width - 120) / drawing.width, (height - 120) / drawing.height);
  const w = Math.round(drawing.width * scale);
  const h = Math.round(drawing.height * scale);
  const inner = svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
  return (
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${width}" height="${height}" fill="${PAGE_BACKGROUND[theme]}"/>` +
    `<svg x="${(width - w) / 2}" y="${(height - h) / 2}" width="${w}" height="${h}" viewBox="0 0 ${drawing.width} ${drawing.height}">${inner}</svg></svg>`
  );
}

async function drawShield(
  entity: EntityFacts,
  badge: BadgeDefinition,
  params: BadgeParams,
  themes: Theme[],
  now: Date,
) {
  const content = shieldContent(entity, badge, params, now);
  const state: RenderState = content ? 'badge' : 'not-yet';
  const shown = content ?? notYetShield(badge, params);
  const svgs = await Promise.all(
    themes.map((theme) =>
      toSvg(<Shield content={shown} palette={shieldPalette(params, theme, shown)} logo={params.logo} />, {
        height: SHIELD_HEIGHT,
      }),
    ),
  );
  return { state, svgs };
}

function entityName(entity: EntityFacts) {
  return entity.kind === 'repo' ? entity.nameWithOwner : entity.login;
}

async function drawPanel(entity: EntityFacts, badge: BadgeDefinition, params: BadgeParams, themes: Theme[], now: Date) {
  const prepared = await prepareDrawing(entity, badge.id, params, now);
  const drawing =
    prepared ?? notYetDrawing(badge.title, entityName(entity), badge.size ?? { width: 800, height: 200 }, params.logo);
  const svgs = await Promise.all(
    themes.map(async (theme) => {
      const svg = await toSvg(drawing.draw(cardPalette(params, theme)), {
        width: drawing.width,
        height: drawing.height,
      });
      return params.size === 'social' && badge.format === 'card' ? socialWrap(svg, drawing, theme) : svg;
    }),
  );
  return { state: (prepared ? 'badge' : 'not-yet') as RenderState, svgs };
}

/** The width of an SVG drawing, from its root. */
const widthOf = (svg: string) => Number(/^<svg\b[^>]*\bwidth="([\d.]+)"/.exec(svg)?.[1] ?? 0);

/** PNG at twice the drawing's size; a social card at its own 1200×630. */
export function toPng(svg: string, scale: 1 | 2 = 2): Promise<Uint8Array<ArrayBuffer>> {
  return svgToPng(svg, widthOf(svg) * scale);
}

/**
 * Draws a badge for an entity in the params' scheme. An Auto SVG without `theme` holds both drawings (spec §4.3);
 * a PNG is one drawing at 2×. `star-history` is the star history chart, drawn as its own route draws it.
 */
export async function renderBadge(
  entity: EntityFacts,
  badge: BadgeDefinition,
  params: BadgeParams,
  format: ImageFormat,
  now = new Date(),
): Promise<RenderedBadge> {
  if (entity.kind === 'repo' && badge.id === 'star-history') {
    // The same input the old star history route builds.
    const { nameWithOwner, history, gainedThisMonth, stars } = entity;
    const input: StarHistoryBadgeInput = history
      ? { kind: 'chart', nameWithOwner, points: history.points, current: history.current, gainedThisMonth }
      : { kind: 'preparing', nameWithOwner, stars, gainedThisMonth };
    const svg = await renderStarHistorySvg(input);
    return {
      state: input.kind === 'chart' ? 'badge' : 'preparing',
      body: format === 'svg' ? svg : await svgToPng(svg),
      contentType: CONTENT_TYPE[format],
    };
  }

  const themes = themesOf(params, format);
  const { state, svgs } =
    badge.format === 'shield'
      ? await drawShield(entity, badge, params, themes, now)
      : await drawPanel(entity, badge, params, themes, now);
  const svg = svgs.length === 2 ? joinAuto(svgs[0], svgs[1]) : shareImages(svgs[0]);

  return {
    state,
    body: format === 'svg' ? svg : await toPng(svg, params.size === 'social' && badge.format === 'card' ? 1 : 2),
    contentType: CONTENT_TYPE[format],
  };
}
