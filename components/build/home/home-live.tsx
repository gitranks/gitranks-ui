'use client';

import { useEffect, useMemo, useState } from 'react';

import { HomeView } from './home-view';
import { type BuildHomeSide, hasBuildOf, homeViewOf } from '@/lib/build/home';
import { BUILD_HOME_MINE_PATH, BUILD_PROJECTS_MINE_PATH, buildStartMinePath } from '@/lib/build/paths';
import type { BuildHome, BuildMine, BuildProjectCard, BuildStart } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The longest the page stays hidden for a person's side: after it, the landing shows and the side comes in place. */
export const HOME_READ_WAIT_MS = 4_000;

/** One key of a JSON answer of one of the person's routes; null on any failure. */
async function readKey<T>(path: string, key: string): Promise<T | null> {
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
 * The person's side of Home: their home and every build they have, read together; and, only for a person with no
 * build, whether an agent of theirs connected, for the landing's main button.
 */
export async function readHomeSide(): Promise<BuildHomeSide> {
  const [home, builds] = await Promise.all([
    readKey<BuildHome>(BUILD_HOME_MINE_PATH, 'home'),
    readKey<BuildMine[]>(BUILD_PROJECTS_MINE_PATH, 'builds'),
  ]);
  const side: BuildHomeSide = { home, builds: Array.isArray(builds) ? builds : null, agentConnected: null };
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
  return <HomeView view={view} projects={projects} now={now} reading={reading} />;
}
