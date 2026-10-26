import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  renderStarHistorySvg,
  type StarHistoryBadgeFormat,
  type StarHistoryBadgeInput,
  svgToPng,
} from './render-star-history-badge';
import { fetchBadgeRepo } from './star-history-badge.loader';
import type { BadgeRepoQuery } from '@/types/generated/graphql';
import { parseRepoParams } from '@/utils/repo-paths';

const FILES: Record<string, StarHistoryBadgeFormat> = {
  'star-history.svg': 'svg',
  'star-history.png': 'png',
};

const CONTENT_TYPE: Record<StarHistoryBadgeFormat, string> = {
  svg: 'image/svg+xml; charset=utf-8',
  png: 'image/png',
};

export const STAR_HISTORY_CACHE_CONTROL = {
  /** The history moves at most daily: long at the edge, short in the browser. */
  chart: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
  /** Short at the edge, so the chart replaces it soon after the history arrives. */
  preparing: 'public, max-age=300, s-maxage=3600',
  notTracked: 'public, max-age=3600, s-maxage=86400',
  notFound: 'public, max-age=300, s-maxage=300',
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

export function getStarHistoryBadgeInput(repo: NonNullable<BadgeRepoQuery['repo']>): StarHistoryBadgeInput {
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

/** The star history badge at `/repo-badges/<owner>/<name>/<file>`; a well-formed path always gets an image. */
export async function getStarHistoryBadgeResponse(ownerParam: string, nameParam: string, file: string) {
  const format = parseStarHistoryFile(file);
  const repoParams = parseRepoParams(ownerParam, nameParam);

  if (!format || !repoParams) {
    return new Response('Badge not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': STAR_HISTORY_CACHE_CONTROL.notFound },
    });
  }

  const repo = await fetchBadgeRepo(repoParams.owner, repoParams.name);

  if (!repo) {
    return imageResponse(await readNotTracked(format), format, STAR_HISTORY_CACHE_CONTROL.notTracked);
  }

  const input = getStarHistoryBadgeInput(repo);
  const svg = await renderStarHistorySvg(input);
  const cacheControl = input.kind === 'chart' ? STAR_HISTORY_CACHE_CONTROL.chart : STAR_HISTORY_CACHE_CONTROL.preparing;

  return imageResponse(format === 'svg' ? svg : await svgToPng(svg), format, cacheControl);
}
