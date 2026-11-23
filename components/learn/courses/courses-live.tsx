'use client';

import { useEffect, useState } from 'react';

import { CoursesView } from './courses-view';
import type { LearnCourseCard, LearnCourseMineCard, LearnLessonListItem } from '@/lib/learn/course';
import type { LearnDepth } from '@/lib/learn/lesson-page';
import { LEARN_COURSES_MINE_PATH } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';

/** The signed-in person's side of all courses: their courses, and each lesson's depth when it could be read. */
export type CoursesSide = { courses: LearnCourseMineCard[]; depths: Record<string, LearnDepth> | null };

/** The person's side of all courses from its route; null when there is none, and on any failure. */
export async function readCoursesSide(): Promise<CoursesSide | null> {
  try {
    const res = await fetch(LEARN_COURSES_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const { mine } = (await res.json()) as { mine?: CoursesSide | null };
    if (!mine || !Array.isArray(mine.courses)) return null;
    const depths = mine.depths && typeof mine.depths === 'object' ? mine.depths : null;
    return { courses: mine.courses, depths };
  } catch {
    return null;
  }
}

/**
 * All courses as the page lives in the browser. The list is the same for everyone and comes drawn for a visitor;
 * once it is up, a person with a session reads their side (their figure and bar on each card, the squares of the
 * lessons found), which fills its places, and a visitor asks for nothing.
 */
export function CoursesLive({
  courses,
  lessons,
  query,
}: {
  courses: readonly LearnCourseCard[];
  lessons: readonly LearnLessonListItem[];
  query: string;
}) {
  const [side, setSide] = useState<CoursesSide | null>(null);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    readCoursesSide().then((read) => {
      if (live) setSide(read);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <CoursesView
      courses={courses}
      lessons={lessons}
      mine={side?.courses ?? null}
      depths={side?.depths ?? null}
      query={query}
    />
  );
}
