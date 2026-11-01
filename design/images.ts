import { createHash } from 'node:crypto';
import { basename } from 'node:path';

import type { EntityFacts } from '@/badge/v3/facts';
import { type BadgeLoaders, getBadgeResponse, parseEntityRef } from '@/badge/v3/route';
import type { EntityKind } from '@/badge/v3/types';
import { SITE_URL } from '@/lib/seo/site';

/**
 * Where the badges the boards show are written, under `project/`: `<board>-<n>.svg`, so a redraw replaces a board's
 * images in place rather than adding new files.
 */
const IMAGES = 'current/img';

const nameOf = (entity: EntityFacts) => (entity.kind === 'repo' ? entity.nameWithOwner : entity.login).toLowerCase();

/**
 * The badge data the boards' badge images and the builder read, by kind and name. The specs' fixtures share names
 * (every developer is `octo-dev`), so each screen names the facts it shows with `withBadgeFacts`.
 */
const facts = new Map<string, EntityFacts>();

/** Adds the facts a screen's badges are drawn from, and gives them back; one set of facts per name. */
export function withBadgeFacts<T extends EntityFacts>(entity: T): T {
  const key = `${entity.kind}:${nameOf(entity)}`;
  const known = facts.get(key);
  if (known && known !== entity) throw new Error(`Two sets of badge facts for ${key}: give one of them another name.`);
  facts.set(key, entity);
  return entity;
}

/** The facts a badge URL or the builder names, as the site would read them; null for an entity it does not know. */
export const findBadgeFacts = (kind: EntityKind, name: string) => facts.get(`${kind}:${name.toLowerCase()}`) ?? null;

const loaders: BadgeLoaders = {
  user: async (login) => findBadgeFacts('user', login),
  org: async (login) => findBadgeFacts('org', login),
  repo: async (owner, name) => findBadgeFacts('repo', `${owner}/${name}`),
};

/**
 * A GitHub-style identicon for an avatar: the fixtures' accounts are made up, so the boards draw no real person's
 * picture. The same key always draws the same one.
 */
function identicon(key: string): string {
  const bytes = createHash('sha256').update(key).digest();
  const hue = Math.round((bytes[0] / 255) * 360);
  const cells: string[] = [];
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 3; column++) {
      if (bytes[1 + row * 3 + column] % 2) continue;
      for (const x of new Set([column, 4 - column]))
        cells.push(`<rect x="${x + 1}" y="${row + 1}" width="1" height="1"/>`);
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7" shape-rendering="crispEdges">` +
    `<rect width="7" height="7" fill="#f0f0f0"/><g fill="hsl(${hue} 55% 55%)">${cells.join('')}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The account an avatar URL is of, or null when the URL is not an avatar. */
function avatarKey(url: URL): string | null {
  if (url.pathname.startsWith('/api/avatar/')) return decodeURIComponent(url.pathname.slice('/api/avatar/'.length));
  if (url.hostname === 'avatars.githubusercontent.com') return url.pathname;
  if (url.hostname === 'github.com' && url.pathname.endsWith('.png')) return url.pathname.slice(1, -4);
  return null;
}

/** A badge URL drawn from the fixtures, as the site's own route draws it at the boards' clock; null when it names none. */
async function drawBadge(url: URL): Promise<string | null> {
  const [, , kind, ...rest] = url.pathname.split('/');
  const file = rest.pop();
  if (!file || (kind !== 'user' && kind !== 'org' && kind !== 'repo')) return null;
  const params = kind === 'repo' ? { owner: rest[0], name: rest[1] } : { login: rest[0] };
  const response = await getBadgeResponse(parseEntityRef(kind, params), file, url.searchParams, loaders, new Date());
  if (!response.ok) {
    throw new Error(
      `${url.pathname}: ${response.status} ${await response.text()}. Name its facts with withBadgeFacts (design/images.ts).`,
    );
  }
  if (!response.headers.get('Content-Type')?.startsWith('image/svg+xml')) {
    throw new Error(`${url.pathname}: the boards draw SVG badges only.`);
  }
  return response.text();
}

const decodeEntities = (value: string) => value.replaceAll('&amp;', '&');
const SITE = new URL(SITE_URL || 'https://gitranks.com').origin;

/**
 * Every image of a board drawn without the site: badges from the fixtures into files beside the boards, avatars as
 * identicons. Any other image stops the export, so no board shows a hole or loads from elsewhere.
 */
export async function drawImages(
  markup: string,
  boardPath: string,
): Promise<{ markup: string; images: Map<string, string> }> {
  const images = new Map<string, string>();
  const up = '../'.repeat(boardPath.split('/').length - 1);
  const sources = new Map<string, string>();
  const board = basename(boardPath, '.dc.html');

  const resolve = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src;
    const url = new URL(src, SITE);
    if (url.origin === SITE && url.pathname === '/_next/image') {
      return resolve(url.searchParams.get('url') ?? '');
    }
    const avatar = avatarKey(url);
    if (avatar) return identicon(avatar);
    if (url.origin === SITE && url.pathname.startsWith('/badge/')) {
      const svg = await drawBadge(url);
      if (svg) {
        const path = `${IMAGES}/${board}-${images.size}.svg`;
        images.set(path, svg);
        return `${up}${path}`;
      }
    }
    throw new Error(`No drawing for the image ${src} on ${boardPath}: draw it in design/images.ts.`);
  };

  for (const [tag] of markup.matchAll(/<img\b[^>]*>/g)) {
    const src = /\ssrc="([^"]*)"/.exec(tag)?.[1];
    if (src && !sources.has(src)) sources.set(src, await resolve(decodeEntities(src)));
  }

  const drawn = markup.replace(/<img\b[^>]*>/g, (tag) =>
    tag
      .replace(/\s(srcSet|srcset)="[^"]*"/, '')
      .replace(/\ssrc="([^"]*)"/, (_, src: string) => ` src="${sources.get(src) ?? src}"`),
  );
  return { markup: drawn, images };
}
