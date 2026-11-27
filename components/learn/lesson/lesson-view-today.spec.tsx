// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonPlayer } from './lesson-player';
import { LessonView, type LessonViewProps, lessonPartsOf } from './lesson-view';
import { LessonInterviewsNote } from '@/components/interviews/learn-gate/course-gate';
import {
  LESSON_NOW,
  mineLearned,
  mineNew,
  setDepths,
  setExampleCodes,
  setGroup,
  setLesson,
  setLessonFull,
} from '@/lib/learn/__fixtures__/lesson-page';

/*
 * A lesson's page without Interviews' part, as a visitor and a learner get it while Interviews is closed: the stored
 * markup was drawn by the page before Interviews joined it, so any change to today's page shows here.
 */

const calls = {
  onNext: () => {},
  onSignIn: () => {},
  onRate: async () => true,
  onComment: async () => true,
  onGraded: () => {},
};

const PAGES: [string, Partial<LessonViewProps>][] = [
  ['a visitor', {}],
  ['a learner, not answered', { viewer: { mine: mineNew, depths: setDepths } }],
  ['a learner, learned', { viewer: { mine: mineLearned, depths: setDepths } }],
  ['a longer lesson, visitor', { lesson: setLessonFull }],
];

const markupOf = (props: Partial<LessonViewProps>) =>
  renderToStaticMarkup(
    <LessonView
      lesson={setLesson}
      examples={[{ name: 'main', codes: setExampleCodes }]}
      group={setGroup}
      viewer={null}
      links={{ markdown: '/learn/lessons/find-duplicates-with-a-set.md', report: 'mailto:hello@gitranks.com' }}
      calls={calls}
      hints={false}
      now={LESSON_NOW}
      timeZone="UTC"
      {...props}
    />,
  );

describe("a lesson's page without Interviews' part", () => {
  it("is today's page, for a visitor and a learner", async () => {
    const pages = PAGES.map(([name, props]) => `<!-- ${name} -->\n${markupOf(props)}\n`);
    await expect(pages.join('\n')).toMatchFileSnapshot('./__snapshots__/lesson-view-today.html');
  });
});

describe("the lesson page's own path while Interviews is closed", () => {
  it("draws the lesson as the view does, the sentence's place empty", () => {
    const links = { markdown: '/learn/lessons/find-duplicates-with-a-set.md', report: 'mailto:hello@gitranks.com' };
    const examples = [{ name: 'main', codes: setExampleCodes }];
    // As the lesson's route puts it together: its parts, the article ending with the sentence about its group.
    const parts = lessonPartsOf({
      lesson: setLesson,
      examples,
      group: setGroup,
      links,
      articleEnd: <LessonInterviewsNote course={setLesson.course.slug} group={setLesson.group.slug} />,
    });
    const page = renderToStaticMarkup(
      <LessonPlayer
        lesson={setLesson}
        group={setGroup}
        {...parts}
        viewer={null}
        calls={calls}
        hints={false}
        now={LESSON_NOW}
        timeZone="UTC"
      />,
    );
    expect(page).toBe(markupOf({}));
  });
});
