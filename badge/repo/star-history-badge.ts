import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  CONTENT_TYPE,
  renderStarHistorySvg,
  type StarHistoryBadgeFormat,
  type StarHistoryBadgeInput,
  svgToPng,
} from './render-star-history-badge';
import { fetchBadgeRepo } from './star-history-badge.loader';
import type { StarHistoryRepoQuery } from '@/types/generated/graphql';
import { parseRepoParams } from '@/utils/repo-paths';

const FILES: Record<string, StarHistoryBadgeFormat> = {
  'star-history.svg': 'svg',
  'star-history.png': 'png',
};

export const STAR_HISTORY_CACHE_CONTROL = {
  /** The history moves at most daily: long at the edge, short in the browser; the last good chart outlives an outage. */
  chart: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800',
  /** Kept for minutes, so the chart replaces it soon after the history arrives. */
  preparing: 'public, max-age=60, s-maxage=300',
  /** Short at the edge too: a repository can become known during the day. */
  notTracked: 'public, max-age=3600, s-maxage=3600',
  notFound: 'public, max-age=300, s-maxage=300',
  unavailable: 'public, max-age=60, s-maxage=60',
} as const;

/** Served as-is for a repository without data, so made-up names cost no drawing. */
const NOT_TRACKED_FILE: Record<StarHistoryBadgeFormat, string> = {
  svg: 'repo-not-tracked.svg',
  png: 'repo-not-tracked.png',
};

const notTrackedCache: Partial<Record<StarHistoryBadgeFormat, Uint8Array<ArrayBuffer>>> = {};

export function parseStarHistoryFile(file: string): StarHistoryBadgeFormat | null {
  return Object.hasOwn(FILES, file) ? FILES[file] : null;
}

export function getStarHistoryBadgeInput(repo: NonNullable<StarHistoryRepoQuery['repo']>): StarHistoryBadgeInput {
  const { nameWithOwner, history, gainedThisMonth } = repo;

  return history
    ? { kind: 'chart', nameWithOwner, points: history.points, current: history.current, gainedThisMonth }
    : { kind: 'preparing', nameWithOwner, stars: repo.stars, gainedThisMonth };
}

async function readNotTracked(format: StarHistoryBadgeFormat) {
  notTrackedCache[format] ??= new Uint8Array(
    await fs.readFile(path.join(process.cwd(), 'public', 'badges', NOT_TRACKED_FILE[format])),
  );
  return notTrackedCache[format];
}

function imageResponse(body: Uint8Array<ArrayBuffer> | string, format: StarHistoryBadgeFormat, cacheControl: string) {
  return new Response(body, { headers: { 'Content-Type': CONTENT_TYPE[format], 'Cache-Control': cacheControl } });
}

/**
 * The star history badge at `/repo-badges/<owner>/<name>/<file>`. A well-formed path gets an image,
 * a redirect to the stored spelling, or a short-cached 503 when the data cannot be read.
 */
export async function getStarHistoryBadgeResponse(ownerParam: string, nameParam: string, file: string) {
  const format = parseStarHistoryFile(file);
  const repoParams = parseRepoParams(ownerParam, nameParam);

  if (!format || !repoParams) {
    return new Response('Badge not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': STAR_HISTORY_CACHE_CONTROL.notFound },
    });
  }

  try {
    return await renderBadgeResponse(repoParams.owner, repoParams.name, file, format);
  } catch (error) {
    console.error('Error rendering the star history badge:', error);
    return new Response(null, {
      status: 503,
      headers: { 'Cache-Control': STAR_HISTORY_CACHE_CONTROL.unavailable, 'Retry-After': '60' },
    });
  }
}

async function renderBadgeResponse(owner: string, name: string, file: string, format: StarHistoryBadgeFormat) {
  const repo = await fetchBadgeRepo(owner, name);

  if (!repo) {
    return imageResponse(await readNotTracked(format), format, STAR_HISTORY_CACHE_CONTROL.notTracked);
  }

  // Case variants and old names share the stored spelling's cache entry.
  if (repo.nameWithOwner !== `${owner}/${name}`) {
    const [storedOwner, storedName] = repo.nameWithOwner.split('/');
    return new Response(null, {
      status: 308,
      headers: {
        Location: `/repo-badges/${encodeURIComponent(storedOwner)}/${encodeURIComponent(storedName)}/${file}`,
        'Cache-Control': STAR_HISTORY_CACHE_CONTROL.chart,
      },
    });
  }

  const input = getStarHistoryBadgeInput(repo);
  const svg = await renderStarHistorySvg(input);
  const cacheControl = input.kind === 'chart' ? STAR_HISTORY_CACHE_CONTROL.chart : STAR_HISTORY_CACHE_CONTROL.preparing;

  return imageResponse(format === 'svg' ? svg : await svgToPng(svg), format, cacheControl);
}
