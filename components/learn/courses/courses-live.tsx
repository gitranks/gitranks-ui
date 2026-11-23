'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CoursesView } from './courses-view';
import type { LearnCourseCard, LearnCourseMineCard, LearnLessonListItem } from '@/lib/learn/course';
import type { LearnDepth } from '@/lib/learn/lesson-page';
import { LEARN_COURSES_MINE_PATH, learnCourseDepthsPath } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';

/** A JSON answer of one of the person's routes; null on any failure. */
async function readJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The person's courses from their route; null when there are none to show, and on any failure. */
export async function readCoursesSide(): Promise<LearnCourseMineCard[] | null> {
  const answer = await readJson<{ mine?: unknown }>(LEARN_COURSES_MINE_PATH);
  return Array.isArray(answer?.mine) ? (answer.mine as LearnCourseMineCard[]) : null;
}

/** The depth of each lesson in the given courses of the person; null on any failure. */
export async function readCourseDepths(courses: readonly string[]): Promise<Record<string, LearnDepth> | null> {
  const answer = await readJson<{ depths?: unknown }>(learnCourseDepthsPath(courses));
  const depths = answer?.depths;
  return depths && typeof depths === 'object' && !Array.isArray(depths) ? (depths as Record<string, LearnDepth>) : null;
}

/**
 * All courses as the page lives in the browser. The list is the same for everyone and comes drawn for a visitor;
 * once it is up, a person with a session reads their courses (their figure and bar on each card) in one read, and a
 * visitor asks for nothing. The depth of each lesson in their courses is read only once a search shows a lesson of
 * one of them, and once: until then its square keeps its place.
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
  const [mine, setMine] = useState<LearnCourseMineCard[] | null>(null);
  const [depths, setDepths] = useState<Record<string, LearnDepth> | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    readCoursesSide().then((read) => {
      if (live) setMine(read);
    });
    return () => {
      live = false;
    };
  }, []);

  const onSquaresShown = useCallback(() => {
    if (asked.current || !mine?.length) return;
    asked.current = true;
    readCourseDepths(mine.map((card) => card.course.slug)).then(setDepths);
  }, [mine]);

  return (
    <CoursesView
      courses={courses}
      lessons={lessons}
      mine={mine}
      depths={depths}
      onSquaresShown={onSquaresShown}
      query={query}
    />
  );
}
