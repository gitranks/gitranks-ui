'use client';

import { useEffect, useState } from 'react';

import { ProjectView } from './project-view';
import { TimeZoneNote } from '@/components/workspace/time-zone-note';
import { HOME_READ_WAIT_MS } from '@/lib/build/home';
import { buildProjectMinePath, buildTestMinePath } from '@/lib/build/paths';
import type { ProjectSide } from '@/lib/build/project';
import type { BuildProjectMine, BuildProjectPage, BuildTest } from '@/lib/build/types';
import { readBuildZone } from '@/lib/build/zone-live';
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
 * The test that waits for the build the page is about, read only when one waits (the end test with the test left, the
 * gold test once open), so the box can say a run in progress or a failed test's score. None on any failure: the box
 * then offers the test as for a first try.
 */
export async function readProjectTest(slug: string, mine: BuildProjectMine): Promise<BuildTest | null> {
  const build = mine.builds[0];
  const kind =
    build?.state.kind === 'test_left'
      ? 'end'
      : build?.state.kind === 'built' && build.state.gold.kind === 'open'
        ? 'gold'
        : null;
  if (!build || !kind) return null;
  try {
    const language = mine.builds.length > 1 ? build.language : null;
    const res = await fetch(buildTestMinePath(slug, kind, language, { plain: true }), { cache: 'no-store' });
    if (!res.ok) return null;
    const { test } = (await res.json()) as { test?: BuildTest | null };
    return test && test.kind === kind ? test : null;
  } catch {
    return null;
  }
}

/**
 * A project's page as it lives in the browser. The page is the same for everyone; once it is up, a person with a
 * session reads their side of the project (and, with the test left, that test), which fills the box and the steps'
 * marks in place, and a visitor asks for nothing. The page comes drawn for a visitor; while a browser with a session
 * reads, what may change stays hidden in its place, and shows by itself after the read's time limit.
 */
export function ProjectLive({ project }: { project: BuildProjectPage }) {
  const [side, setSide] = useState<ProjectSide>({ kind: 'pending' });
  const [reading, setReading] = useState(true);
  const { slug } = project;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setSide({ kind: 'visitor' });
      setReading(false);
      return;
    }
    let live = true;
    setSide({ kind: 'pending' });
    setReading(true);
    const late = setTimeout(() => setReading(false), HOME_READ_WAIT_MS);
    void (async () => {
      const [mine, zone] = await Promise.all([readProjectMine(slug), readBuildZone()]);
      const test = mine ? await readProjectTest(slug, mine) : null;
      if (!live) return;
      clearTimeout(late);
      setSide(mine ? { kind: 'person', mine, test, zone } : { kind: 'session' });
      setReading(false);
    })();
    return () => {
      live = false;
      clearTimeout(late);
    };
  }, [slug]);

  return (
    <>
      <ProjectView project={project} side={side} reading={reading} />
      {/* Once the person's side is read, their device's time zone is sent, as on Learn's pages. */}
      {side.kind === 'person' ? <TimeZoneNote /> : null}
    </>
  );
}
