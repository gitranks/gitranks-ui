'use client';

import type { Route } from 'next';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';

import type { GoFurtherParts } from './doors/go-further-rows';
import { hasSessionHint } from '@/lib/session-hint';

/*
 * The doors into Build as Learn's and Contribute's pages import them: the only part of Build those pages hold. It
 * draws the page without them, and fetches the doors' code only in a browser with a session (a door is about the
 * person's own builds, so a visitor has none), so a visitor downloads none of it. Build's own words live in the parts
 * fetched.
 */

const loadDoors = () => import('./doors/doors-parts');
const CourseLine = lazy(() => loadDoors().then((parts) => ({ default: parts.CourseBuildLine })));
const FurtherRows = lazy(() => loadDoors().then((parts) => ({ default: parts.GoFurtherRows })));
const IssueLine = lazy(() => loadDoors().then((parts) => ({ default: parts.IssueBuildLine })));

/**
 * Whether this browser may draw a door: no while hydrating and for a visitor. With a session, the doors' code and the
 * doors of `of` are asked together, so the door is drawn after one trip, not two.
 */
function useDoorsOpen(of: { course: string } | { lesson: string }): boolean {
  const [open, setOpen] = useState(false);
  const key = 'course' in of ? `course:${of.course}` : `lesson:${of.lesson}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` names `of` whole.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    void loadDoors()
      .then((parts) => parts.readBuildDoors(of))
      .catch(() => {});
    setOpen(true);
  }, [key]);
  return open;
}

/** The line under a course's numbers: none for a visitor, and until a project names the course. */
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

/** The line after "Not for me" on an issue: none for a visitor, and until there is a door to offer. */
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
