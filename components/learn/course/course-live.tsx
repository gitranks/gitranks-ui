'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { CourseView } from './course-view';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { CoursePerson, LearnCourse, LearnCourseCard, LearnCourseMine } from '@/lib/learn/course';
import { sendLearnCourseFeedbackAction } from '@/lib/learn/course.actions';
import { coursePath, learnCourseMinePath, learnCourseRealMinePath, learnCourseSidePath } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';

/**
 * The signed-in person's side of a course, whether the check leads the page, and their setup's main language (asked
 * with the check; null when it has none, or it was not read).
 */
export type CourseSide = { mine: LearnCourseMine; checkFirst: boolean; mainLanguage: string | null };

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
    const { course, checkFirst, mainLanguage } = (await res.json()) as {
      course?: LearnCourseMine | null;
      checkFirst?: unknown;
      mainLanguage?: unknown;
    };
    // Only a whole side is drawn: a part of one would mark the page wrong.
    if (!course || course.slug !== slug || !Array.isArray(course.lessons) || !course.check) return null;
    return {
      mine: course,
      checkFirst: checkFirst === true,
      mainLanguage: typeof mainLanguage === 'string' && mainLanguage ? mainLanguage : null,
    };
  } catch {
    return null;
  }
}

/** The open issues of the person's list for lessons of the course, from their route; null for none and on any failure. */
export async function readCourseOpenIssues(slug: string): Promise<number | null> {
  try {
    const res = await fetch(learnCourseRealMinePath(slug), { cache: 'no-store' });
    if (!res.ok) return null;
    const { openIssues } = (await res.json()) as { openIssues?: unknown };
    return typeof openIssues === 'number' && openIssues > 0 ? openIssues : null;
  } catch {
    return null;
  }
}

/** Where the person stands: not known yet, a visitor, a session whose side did not come, or a learner with theirs. */
type Personal = { kind: CoursePerson } | { kind: 'learner'; side: CourseSide };

/**
 * A course's page as it lives in the browser. The page is the same for everyone; once it is up, a person with a
 * session reads their side, which fills the page in place, and a visitor asks for nothing. Only a visitor is asked to
 * sign in: while a session's side is on its way nothing is lit, and a session whose side does not come (a failed read)
 * is never sent to sign in again. Signing in comes back to the course; a rating is sent
 * as the session's user. The open issues of the person's list for the course come in a read of their own, which an
 * API without them answers with none: the third box then stays as it was.
 */
export function CourseLive({ course, others }: { course: LearnCourse; others: readonly LearnCourseCard[] }) {
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  const [openIssues, setOpenIssues] = useState<number | null>(null);
  const { slug } = course;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    setPersonal({ kind: 'pending' });
    setOpenIssues(null);
    // The side and its open issues land together, so the third box is drawn once, never changed after.
    Promise.all([readCourseSide(slug), readCourseOpenIssues(slug)]).then(([side, count]) => {
      if (!live) return;
      setOpenIssues(count);
      setPersonal(side ? { kind: 'learner', side } : { kind: 'session' });
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
      mainLanguage={side?.mainLanguage ?? null}
      openIssues={side ? openIssues : null}
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
