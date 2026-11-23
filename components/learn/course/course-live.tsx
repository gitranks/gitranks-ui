'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { CourseView } from './course-view';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { CoursePerson, LearnCourse, LearnCourseCard, LearnCourseMine } from '@/lib/learn/course';
import { sendLearnCourseFeedbackAction } from '@/lib/learn/course.actions';
import { coursePath, learnCourseMinePath, learnCourseSidePath } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';

/** The signed-in person's side of a course, and whether the check leads the page. */
export type CourseSide = { mine: LearnCourseMine; checkFirst: boolean };

// The check's page is live: a course not started may lead with it.
const CHECK_PAGE_LIVE = true;

/**
 * The person's side of a course from its route; null when there is none, and on any failure. `askCheck` asks whether
 * the check leads the page too, which costs the route a read of the level.
 */
export async function readCourseSide(slug: string, askCheck = CHECK_PAGE_LIVE): Promise<CourseSide | null> {
  try {
    const res = await fetch(askCheck ? learnCourseSidePath(slug) : learnCourseMinePath(slug), { cache: 'no-store' });
    if (!res.ok) return null;
    const { course, checkFirst } = (await res.json()) as { course?: LearnCourseMine | null; checkFirst?: unknown };
    // Only a whole side is drawn: a part of one would mark the page wrong.
    if (!course || course.slug !== slug || !Array.isArray(course.lessons) || !course.check) return null;
    return { mine: course, checkFirst: checkFirst === true };
  } catch {
    return null;
  }
}

/** Where the person stands: not known yet, a visitor, a session whose side did not come, or a learner with theirs. */
type Personal = { kind: CoursePerson } | { kind: 'learner'; side: CourseSide };

/**
 * A course's page as it lives in the browser. The page is the same for everyone; once it is up, a person with a
 * session reads their side, which fills the page in place, and a visitor asks for nothing. Only a visitor is asked to
 * sign in: while a session's side is on its way nothing is lit, and a session whose side does not come (a failed read,
 * or Learn not open to them yet) is never sent to sign in again. Signing in comes back to the course; a rating is sent
 * as the session's user.
 */
export function CourseLive({ course, others }: { course: LearnCourse; others: readonly LearnCourseCard[] }) {
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  const { slug } = course;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    setPersonal({ kind: 'pending' });
    readCourseSide(slug).then((side) => {
      if (live) setPersonal(side ? { kind: 'learner', side } : { kind: 'session' });
    });
    return () => {
      live = false;
    };
  }, [slug]);

  const side = personal.kind === 'learner' ? personal.side : null;
  return (
    <CourseView
      course={course}
      mine={side?.mine ?? null}
      person={personal.kind === 'learner' ? 'session' : personal.kind}
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
