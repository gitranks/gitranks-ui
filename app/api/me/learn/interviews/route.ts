import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { coursesInterviewsOf } from '@/components/interviews/learn-gate/courses-interviews';
import { interviewsOpenWithin } from '@/lib/interviews/interviews-gate';
import { INTERVIEWS_NO_STORE, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { loadInterviewsForCourses } from '@/lib/interviews/learn.data';
import type { LearnCourse } from '@/lib/learn/course';
import { loadLearnCourse } from '@/lib/learn/course.data';

/**
 * What the list of all courses shows of Interviews, for a person Interviews is open to, read in the browser after the
 * list is up: `{ interviews }`, the top five, the companies with the courses their plans use, and the cards of the
 * section Interviews (each read by its slug, which answers while the list leaves them out). Null signed out (without
 * asking the API), when Interviews is not open to them, with nothing to show, and on any failure. Never kept: it
 * answers only for this person.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = interviewsViewerOf(req);
  let interviews = null;
  if (viewer && (await interviewsOpenWithin(viewer))) {
    try {
      const answer = await loadInterviewsForCourses();
      const read = await Promise.all(answer.section.map(({ slug }) => loadLearnCourse(slug).catch(() => null)));
      interviews = coursesInterviewsOf(
        answer,
        read.filter((course): course is LearnCourse => course !== null),
      );
    } catch {
      interviews = null;
    }
  }
  return NextResponse.json({ interviews }, { headers: INTERVIEWS_NO_STORE });
});
