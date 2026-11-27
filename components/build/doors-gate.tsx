'use client';

import type { Route } from 'next';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';

import { buildOpenForDocument } from './build-viewer';
import type { GoFurtherParts } from './doors/go-further-rows';

/*
 * The doors into Build as Learn's and Contribute's pages import them: the only part of Build those pages hold. It
 * draws today's page, and fetches the doors' code only once this browser knows Build is open to its person, so a
 * reader Build is closed to downloads none of it. Build's own words live in the parts fetched.
 */

const loadDoors = () => import('./doors/doors-parts');
const CourseLine = lazy(() => loadDoors().then((parts) => ({ default: parts.CourseBuildLine })));
const FurtherRows = lazy(() => loadDoors().then((parts) => ({ default: parts.GoFurtherRows })));
const IssueLine = lazy(() => loadDoors().then((parts) => ({ default: parts.IssueBuildLine })));

/**
 * Whether Build is open to this browser's person: no while hydrating and for anyone closed. Once it is, the doors'
 * code and the doors of `of` are asked together, so the door is drawn after one trip, not two.
 */
function useDoorsOpen(of: { course: string } | { lesson: string }): boolean {
  const [open, setOpen] = useState(false);
  const key = 'course' in of ? `course:${of.course}` : `lesson:${of.lesson}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` names `of` whole.
  useEffect(() => {
    let live = true;
    void buildOpenForDocument().then((yes) => {
      if (!yes || !live) return;
      void loadDoors()
        .then((parts) => parts.readBuildDoors(of))
        .catch(() => {});
      setOpen(true);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return open;
}

/** The line under a course's numbers: none, until Build is open to the person and a project names the course. */
export function CourseBuildDoor({ course }: { course: string }) {
  const open = useDoorsOpen({ course });
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <CourseLine course={course} />
    </Suspense>
  );
}

/** The last box of a finished course: `today`, its list as drawn today, until the doors are read. */
export function GoFurtherDoor({ course, parts, today }: { course: string; parts: GoFurtherParts; today: ReactNode }) {
  const open = useDoorsOpen({ course });
  if (!open) return today;
  return (
    <Suspense fallback={today}>
      <FurtherRows course={course} parts={parts} today={today} />
    </Suspense>
  );
}

/** The line after "Not for me" on an issue: none, until Build is open to the person and there is a door to offer. */
export function IssueBuildDoor({
  lesson,
}: {
  lesson: { slug: string; title: string; href?: Route | null; learned: boolean };
}) {
  const open = useDoorsOpen({ lesson: lesson.slug });
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <IssueLine lesson={lesson} />
    </Suspense>
  );
}
