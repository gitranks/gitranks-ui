'use client';

import { useEffect, useState } from 'react';

import { ProjectsView } from './projects-view';
import { BUILD_PROJECTS_MINE_PATH } from '@/lib/build/paths';
import type { BuildMine, BuildProjectCard } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's builds of every project they touched; null signed out, or on any failure. */
export async function readProjectsSide(): Promise<BuildMine[] | null> {
  try {
    const res = await fetch(BUILD_PROJECTS_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const { builds } = (await res.json()) as { builds?: unknown };
    return Array.isArray(builds) ? (builds as BuildMine[]) : null;
  } catch {
    return null;
  }
}

/**
 * All projects as the page lives in the browser. The list is the same for everyone and comes drawn for a visitor;
 * once it is up, a browser with a session reads the person's builds in one read, and their place shows on each card
 * in a line kept for it from the first paint. A visitor asks for nothing.
 */
export function ProjectsLive({ projects }: { projects: readonly BuildProjectCard[] }) {
  const [mine, setMine] = useState<BuildMine[] | null>(null);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    void readProjectsSide().then((read) => {
      if (live) setMine(read);
    });
    return () => {
      live = false;
    };
  }, []);

  return <ProjectsView projects={projects} mine={mine} />;
}
