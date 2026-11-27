import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoursesView } from './courses-view';
import { courseCards, coursesMine, djangoCourse, kubernetesCourse, lessonList } from '@/lib/learn/__fixtures__/course';

/*
 * The list of all courses without Interviews' part, as a visitor and a learner get it while Interviews is closed: the
 * stored markup was drawn by the list before Interviews joined it, so any change to today's page shows here.
 */

const COURSES = [djangoCourse, ...courseCards, kubernetesCourse];
const QUERIES = ['', 'go', 'python', 'northwind', 'kubernetes', 'course', 'company', 'algo'];

const markupOf = (query: string, learner: boolean) =>
  renderToStaticMarkup(
    <CoursesView
      courses={COURSES}
      lessons={lessonList}
      mine={learner ? coursesMine : null}
      depths={null}
      query={query}
      hints
    />,
  );

describe("the list of all courses without Interviews' part", () => {
  it("is today's list, for a visitor and a learner, at rest and for each search", async () => {
    const pages = QUERIES.flatMap((query) =>
      [false, true].map(
        (learner) =>
          `<!-- q=${JSON.stringify(query)} ${learner ? 'learner' : 'visitor'} -->\n${markupOf(query, learner)}\n`,
      ),
    );
    await expect(pages.join('\n')).toMatchFileSnapshot('./__snapshots__/courses-view-today.html');
  });
});
