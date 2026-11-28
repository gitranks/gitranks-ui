'use client';

import { useEffect, useState } from 'react';

import { BuildStepView, type BuildStepViewProps } from './step-view';
import { HOME_READ_WAIT_MS } from '@/lib/build/home';
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
 * themselves (for the squares and where each build stands). None for a visitor, and when the step's own read fails.
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
 * cached, so it comes drawn for a visitor. While a browser with a session reads, everything under the title stays
 * hidden in its place (the site's signed-in mark on the page hides it before any script runs), then shows with the
 * squares, the row and the code in the build's language; it shows by itself after the read's time limit. A browser
 * with no session asks nothing; a read that fails leaves the visitor's page.
 */
export function BuildStepLive(props: Omit<BuildStepViewProps, 'personal' | 'reading'>) {
  const [personal, setPersonal] = useState<StepPersonal | null>(null);
  const [reading, setReading] = useState(true);
  const project = props.page.project.slug;
  const step = props.page.step.slug;
  useEffect(() => {
    setPersonal(null);
    if (!hasSessionHint(document.cookie)) {
      setReading(false);
      return;
    }
    let live = true;
    setReading(true);
    const late = setTimeout(() => setReading(false), HOME_READ_WAIT_MS);
    void readStepPersonal(project, step).then((read) => {
      if (!live) return;
      clearTimeout(late);
      setPersonal(read);
      setReading(false);
    });
    return () => {
      live = false;
      clearTimeout(late);
    };
  }, [project, step]);
  return <BuildStepView {...props} personal={personal} reading={reading} />;
}
