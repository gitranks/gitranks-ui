'use client';

import { useEffect, useState } from 'react';

import { BuildStepView, type BuildStepViewProps } from './step-view';
import { buildProjectMinePath, buildStepMinePath } from '@/lib/build/paths';
import type { StepPersonal } from '@/lib/build/step-page';
import type { BuildProjectMine, BuildStepMine } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** One of the person's routes: its `mine`; none on any failure. */
async function readMine<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as { mine?: T | null }).mine ?? null;
  } catch {
    return null;
  }
}

/**
 * The person's side of a step: where the step stands for each of their builds of the project, and the builds
 * themselves (for the squares and where each build stands). None for a visitor, when Build is not open to them, and
 * when the step's own read fails.
 */
export async function readStepPersonal(project: string, step: string): Promise<StepPersonal | null> {
  const [stepMine, projectMine] = await Promise.all([
    readMine<BuildStepMine>(buildStepMinePath(project, step)),
    readMine<BuildProjectMine>(buildProjectMinePath(project)),
  ]);
  return stepMine ? { step: stepMine, project: projectMine } : null;
}

/**
 * A step's page with the person's side read in the browser once the page is up: the page is the same for everyone and
 * cached, so it draws a visitor's at first, and the squares, the row and the language switch's start change in place
 * when the read comes. A browser with no session asks nothing; a read that fails leaves the visitor's page.
 */
export function BuildStepLive(props: Omit<BuildStepViewProps, 'personal'>) {
  const [personal, setPersonal] = useState<StepPersonal | null>(null);
  const project = props.page.project.slug;
  const step = props.page.step.slug;
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    void readStepPersonal(project, step).then((read) => {
      if (live) setPersonal(read);
    });
    return () => {
      live = false;
    };
  }, [project, step]);
  return <BuildStepView {...props} personal={personal} />;
}
