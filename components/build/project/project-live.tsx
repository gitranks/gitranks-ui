'use client';

import { useEffect, useState } from 'react';

import { ProjectView } from './project-view';
import { buildProjectMinePath, buildTestMinePath } from '@/lib/build/paths';
import type { ProjectSide } from '@/lib/build/project';
import type { BuildProjectMine, BuildProjectPage, BuildTest } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's side of a project from its route; null when there is none, and on any failure. */
export async function readProjectMine(slug: string): Promise<BuildProjectMine | null> {
  try {
    const res = await fetch(buildProjectMinePath(slug), { cache: 'no-store' });
    if (!res.ok) return null;
    const { mine } = (await res.json()) as { mine?: BuildProjectMine | null };
    // Only a whole side is drawn: a part of one would mark the page wrong.
    if (!mine || !Array.isArray(mine.builds) || typeof mine.agentConnected !== 'boolean') return null;
    return { ...mine, say: typeof mine.say === 'string' ? mine.say : '' };
  } catch {
    return null;
  }
}

/**
 * The end test of the build the page is about, read only when that build has the test left, so the box can say a
 * failed test's score. None on any failure: the box then offers the test as for a first try.
 */
export async function readProjectTest(slug: string, mine: BuildProjectMine): Promise<BuildTest | null> {
  const build = mine.builds[0];
  if (build?.state.kind !== 'test_left') return null;
  try {
    const language = mine.builds.length > 1 ? build.language : null;
    const res = await fetch(buildTestMinePath(slug, 'end', language), { cache: 'no-store' });
    if (!res.ok) return null;
    const { test } = (await res.json()) as { test?: BuildTest | null };
    return test && test.kind === 'end' ? test : null;
  } catch {
    return null;
  }
}

/**
 * A project's page as it lives in the browser. The page is the same for everyone; once it is up, a person with a
 * session reads their side of the project (and, with the test left, that test), which fills the box and the steps'
 * marks in place, and a visitor asks for nothing. While the side is on its way the box shows the sentence alone, with
 * no button that may turn out wrong.
 */
export function ProjectLive({ project }: { project: BuildProjectPage }) {
  const [side, setSide] = useState<ProjectSide>({ kind: 'pending' });
  const { slug } = project;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setSide({ kind: 'visitor' });
      return;
    }
    let live = true;
    setSide({ kind: 'pending' });
    void (async () => {
      const mine = await readProjectMine(slug);
      const test = mine ? await readProjectTest(slug, mine) : null;
      if (!live) return;
      setSide(mine ? { kind: 'person', mine, test } : { kind: 'session' });
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  return <ProjectView project={project} side={side} />;
}
