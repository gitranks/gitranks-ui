'use client';

import { useEffect, useMemo, useState } from 'react';

import { HomeView } from './home-view';
import { TimeZoneNote } from '@/components/workspace/time-zone-note';
import { type BuildHomeSide, HOME_READ_WAIT_MS, hasBuildOf, homeViewOf } from '@/lib/build/home';
import {
  BUILD_HOME_MINE_PATH,
  BUILD_PROJECTS_MINE_PATH,
  buildStartMinePath,
  buildTestMinePath,
} from '@/lib/build/paths';
import type { BuildHome, BuildMine, BuildProjectCard, BuildStart, BuildTest } from '@/lib/build/types';
import { readBuildZone, zoneSent } from '@/lib/build/zone-live';
import { hasSessionHint } from '@/lib/session-hint';

/** One key of a JSON answer of one of the person's routes; null on any failure. */
export async function readKey<T>(path: string, key: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    const answer = (await res.json()) as Record<string, unknown> | null;
    return (answer?.[key] as T | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * The person's side of Home, once the browser's zone is saved when it is new: their home, every build they have and the
 * zone their days are counted in, read together; then the test that waits first, when one does, so the box can say a
 * run in progress or a failed try; and, only for a person with no build, whether an agent of theirs connected, for the
 * landing's main button.
 */
export async function readHomeSide(): Promise<BuildHomeSide> {
  // A zone being saved first: the home's days and the zone are read in it.
  await zoneSent();
  const [home, builds, zone] = await Promise.all([
    readKey<BuildHome>(BUILD_HOME_MINE_PATH, 'home'),
    readKey<BuildMine[]>(BUILD_PROJECTS_MINE_PATH, 'builds'),
    readBuildZone(),
  ]);
  const side: BuildHomeSide = { home, builds: Array.isArray(builds) ? builds : null, agentConnected: null, zone };
  const waiting = home?.tests?.[0];
  if (waiting) {
    const path = buildTestMinePath(waiting.project.slug, waiting.kind, waiting.language, { plain: true });
    side.test = await readKey<BuildTest>(path, 'test');
  }
  if (home && !hasBuildOf(side)) {
    side.agentConnected = (await readKey<BuildStart>(buildStartMinePath(), 'start'))?.agentConnected ?? null;
  }
  return side;
}

/**
 * Build's home as it lives in the browser. The page is the same for everyone and comes drawn as the landing; once it
 * is up, a browser with a session reads the person's side, and the page becomes their home when they have a build,
 * or the landing with "Pick a project" when an agent of theirs connected. While it reads, a browser with a session
 * keeps the page hidden in its place, so a builder never sees the landing first; a visitor asks for nothing.
 */
export function HomeLive({ projects }: { projects: readonly BuildProjectCard[] }) {
  const [side, setSide] = useState<BuildHomeSide | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [reading, setReading] = useState(true);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setReading(false);
      return;
    }
    let live = true;
    const late = setTimeout(() => setReading(false), HOME_READ_WAIT_MS);
    void readHomeSide().then((read) => {
      if (!live) return;
      clearTimeout(late);
      setSide(read);
      setNow(new Date());
      setReading(false);
    });
    return () => {
      live = false;
      clearTimeout(late);
    };
  }, []);

  const view = useMemo(() => homeViewOf(side, projects), [side, projects]);
  return (
    <>
      <HomeView view={view} projects={projects} now={now} zone={side?.zone} reading={reading} />
      {/* Once the person's home is read, their device's time zone is sent, as on Learn's pages. */}
      {side?.home ? <TimeZoneNote /> : null}
    </>
  );
}
