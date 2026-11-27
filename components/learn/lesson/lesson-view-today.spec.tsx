// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonView, type LessonViewProps } from './lesson-view';
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
