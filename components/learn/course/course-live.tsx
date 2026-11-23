'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { CourseView } from './course-view';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { LearnCourse, LearnCourseCard, LearnCourseMine } from '@/lib/learn/course';
import { sendLearnCourseFeedbackAction } from '@/lib/learn/course.actions';
import { coursePath, learnCourseMinePath } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';

/** The signed-in person's side of a course, and whether the check leads the page. */
export type CourseSide = { mine: LearnCourseMine; checkFirst: boolean };

/** The person's side of a course from its route; null when there is none, and on any failure. */
export async function readCourseSide(slug: string): Promise<CourseSide | null> {
  try {
    const res = await fetch(learnCourseMinePath(slug), { cache: 'no-store' });
    if (!res.ok) return null;
    const { course, checkFirst } = (await res.json()) as { course?: LearnCourseMine | null; checkFirst?: unknown };
    // Only a whole side is drawn: a part of one would mark the page wrong.
    if (!course || course.slug !== slug || !Array.isArray(course.lessons) || !course.check) return null;
    return { mine: course, checkFirst: checkFirst === true };
  } catch {
    return null;
  }
}

/**
 * A course's page as it lives in the browser. The page is the same for everyone and comes drawn for a visitor; once it
 * is up, a person with a session reads their side, which fills the page in place, and a visitor asks for nothing.
 * Signing in comes back to the course; a rating is sent as the session's user.
 */
export function CourseLive({ course, others }: { course: LearnCourse; others: readonly LearnCourseCard[] }) {
  const [side, setSide] = useState<CourseSide | null>(null);
  const { slug } = course;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    readCourseSide(slug).then((read) => {
      if (live) setSide(read);
    });
    return () => {
      live = false;
    };
  }, [slug]);

  return (
    <CourseView
      course={course}
      mine={side?.mine ?? null}
      others={others}
      checkFirst={side?.checkFirst ?? false}
      calls={{
        onSignIn: () => {
          signIn(IDENTITY_PROVIDER, { redirectTo: coursePath(slug) }).catch(() => {});
        },
        onRate: async (good) => {
          const result = await sendLearnCourseFeedbackAction({ course: slug, good });
          return result.ok && result.data;
        },
      }}
    />
  );
}
