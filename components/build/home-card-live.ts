'use client';

import { useEffect, useState } from 'react';

import { BUILD_READ_WAIT_MS, buildOpenForDocument, readBuildKey, SERVED_BUILD_VIEWER } from './build-viewer';
import type { BuildCardSide } from '@/lib/build/home-card';
import { BUILD_HOME_MINE_PATH, BUILD_PROJECTS_MINE_PATH } from '@/lib/build/paths';
import type { BuildHome, BuildMine } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's side of Build's card as read: each null when not read, or the read failed. */
export type BuildCardReads = Pick<BuildCardSide, 'home' | 'builds'>;

/** What the block knows of Build's card: whether the reads ended, and what they gave. */
export type BuildCardRead = { settled: boolean } & BuildCardReads;

const NOT_READ: BuildCardRead = { settled: false, home: null, builds: null };
const NOTHING_TO_READ: BuildCardRead = { settled: true, home: null, builds: null };

/** How long the browser waits for the person's side of Build's card; later, the card promotes and the reads stop. */
export const BUILD_CARD_WAIT_MS = BUILD_READ_WAIT_MS;

/** The last card read in this document, so the block drawn again on a return to the home page has it at once. */
let lastRead: BuildCardRead | null = null;

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
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<[undefined, undefined]>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve([undefined, undefined]);
    }, waitMs);
  });
  try {
    const [home, builds] = await Promise.race([
      Promise.all([
        readBuildKey(BUILD_HOME_MINE_PATH, 'home', controller.signal),
        readBuildKey(BUILD_PROJECTS_MINE_PATH, 'builds', controller.signal),
      ]),
      late,
    ]);
    return { home: homeOf(home), builds: Array.isArray(builds) ? (builds as BuildMine[]) : null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build's card on the home page. A browser with no session asks nothing and settles at once (the card promotes). For a
 * signed-in person, the card is read as soon as Build is known to be open to them (alongside the header's bar, not
 * after it), within the wait, then settled in one change; a person Build is not open to asks nothing more. `onOpen`
 * runs once Build is known to be open, so the block can fetch its code meanwhile. Drawn again later in the same
 * document (back on the home page), the block starts from the last read and its words change in place once read again.
 */
export function useBuildCardSide(onOpen?: () => void): BuildCardRead {
  const [read, setRead] = useState<BuildCardRead>(() => lastRead ?? NOT_READ);

  // biome-ignore lint/correctness/useExhaustiveDependencies: read once each time the block is drawn.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      // Nothing to read: the card promotes, once Build is open to everyone (until then the block is today's).
      if (SERVED_BUILD_VIEWER.open) setRead(NOTHING_TO_READ);
      return;
    }
    let live = true;
    void (async () => {
      if (!(await buildOpenForDocument())) return;
      onOpen?.();
      const settled: BuildCardRead = { settled: true, ...(await readBuildCardSide()) };
      lastRead = settled;
      if (live) setRead(settled);
    })();
    return () => {
      live = false;
    };
  }, []);

  return read;
}

/** Forgets the last card read (tests). */
export function forgetBuildCardRead(): void {
  lastRead = null;
}
