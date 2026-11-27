'use client';

import { useEffect, useState } from 'react';

import { readBuildKey } from './build-viewer';
import type { BuildCardSide } from '@/lib/build/home-card';
import { BUILD_HOME_MINE_PATH, BUILD_PROJECTS_MINE_PATH } from '@/lib/build/paths';
import type { BuildHome, BuildMine } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's side of Build's card as read: each null when not read, or the read failed. */
export type BuildCardReads = Pick<BuildCardSide, 'home' | 'builds'>;

const NOT_READ: BuildCardRead = { settled: false, home: null, builds: null };

/** How long the browser waits for the person's side of Build's card; later, the card promotes and the reads stop. */
export const BUILD_CARD_WAIT_MS = 3_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A home as the route answers it, with its three lists; null for anything else. */
function homeOf(value: unknown): BuildHome | null {
  if (!isRecord(value)) return null;
  const { builds, tests, next } = value;
  return Array.isArray(builds) && Array.isArray(tests) && Array.isArray(next) ? (value as BuildHome) : null;
}

/**
 * The person's side of Build's card: their home and every build they have, read together, within the wait. A read
 * that fails is null; past the wait both are.
 */
export async function readBuildCardSide(waitMs = BUILD_CARD_WAIT_MS): Promise<BuildCardReads> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), waitMs);
  try {
    const [home, builds] = await Promise.all([
      readBuildKey(BUILD_HOME_MINE_PATH, 'home', controller.signal),
      readBuildKey(BUILD_PROJECTS_MINE_PATH, 'builds', controller.signal),
    ]);
    return { home: homeOf(home), builds: Array.isArray(builds) ? (builds as BuildMine[]) : null };
  } finally {
    clearTimeout(timer);
  }
}

/** What the block knows of Build's card: whether the reads ended, and what they gave. */
export type BuildCardRead = { settled: boolean } & BuildCardReads;

/**
 * Build's card for a viewer Build is open to, read once `open` is known: a browser with no session asks nothing and
 * settles at once (the card promotes); a signed-in person's side is read, then settled, in one change.
 */
export function useBuildCardSide(open: boolean): BuildCardRead {
  const [read, setRead] = useState<BuildCardRead>(NOT_READ);

  useEffect(() => {
    if (!open) return;
    if (!hasSessionHint(document.cookie)) {
      setRead({ ...NOT_READ, settled: true });
      return;
    }
    let live = true;
    void readBuildCardSide().then((reads) => {
      if (live) setRead({ settled: true, ...reads });
    });
    return () => {
      live = false;
    };
  }, [open]);

  return read;
}
