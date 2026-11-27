import { describe, expect, it } from 'vitest';

import { graphsInPlan, graphsLastInPlan, graphsTitles } from './__fixtures__/lesson-in-plan';
import { seniorFinished, seniorInProgress, seniorNotStarted, seniorStopped } from './__fixtures__/mine';
import { northwindSeniorPlan } from './__fixtures__/plans';
import { HELD_LINE, isLessonPlace, lessonInPlanOf, lessonSettingOf, nextInPartOf, planQueryOf } from './lesson-in-plan';

const GRAPHS = { course: 'algorithms', group: 'graphs' };

describe("a lesson's ?plan=", () => {
  it('names a plan by two slugs, and nothing else', () => {
    expect(planQueryOf('northwind/senior-software-engineer')).toEqual({
      company: 'northwind',
      plan: 'senior-software-engineer',
    });
    for (const value of [
      null,
      '',
      'northwind',
      'northwind/',
      '/senior',
      'northwind/senior/more',
      'Northwind/senior',
      'about/senior',
      'northwind/next',
      'north wind/senior',
    ]) {
      expect(planQueryOf(value)).toBeNull();
    }
  });

  it("asks about a lesson's place only when its three parts are slugs", () => {
    expect(isLessonPlace({ slug: 'graphs-4', ...GRAPHS })).toBe(true);
    expect(isLessonPlace({ slug: 'graphs-4', course: 'algorithms', group: null })).toBe(false);
    expect(isLessonPlace({ slug: '../x', ...GRAPHS })).toBe(false);
  });
});

describe('a lesson inside the plan', () => {
  it("is the first part of the plan that is the lesson's group of its course, with its round", () => {
    expect(lessonInPlanOf(northwindSeniorPlan, seniorInProgress, GRAPHS, false)).toEqual(graphsInPlan);
    const values = lessonInPlanOf(
      northwindSeniorPlan,
      seniorInProgress,
      { course: 'interviewing-at-northwind', group: 'northwind-values' },
      true,
    );
    expect(values).toMatchObject({ round: { number: 5, title: 'Values interview' }, held: true });
    expect(values?.lessons).toHaveLength(6);
  });

  it('is none unless the plan is in progress, and none for a lesson the plan does not hold', () => {
    for (const mine of [null, seniorNotStarted, seniorStopped, seniorFinished]) {
      expect(lessonInPlanOf(northwindSeniorPlan, mine, GRAPHS, false)).toBeNull();
    }
    expect(lessonInPlanOf(northwindSeniorPlan, seniorInProgress, { course: 'algorithms', group: 'trees' }, false)).toBe(
      null,
    );
    // The same group's slug in another course is another group.
    expect(
      lessonInPlanOf(northwindSeniorPlan, seniorInProgress, { course: 'linux-basics', group: 'graphs' }, false),
    ).toBe(null);
  });
});

describe('the next lesson of a part', () => {
  const lessons = [
    { slug: 'a', done: true },
    { slug: 'b', done: false },
    { slug: 'c', done: true },
    { slug: 'd', done: false },
  ];

  it('is the first one not learned after this one, else the first before it', () => {
    expect(nextInPartOf(lessons, 'a')).toBe('b');
    expect(nextInPartOf(lessons, 'b')).toBe('d');
    expect(nextInPartOf(lessons, 'd')).toBe('b');
  });

  it('is none when every other lesson is learned: this one is the last', () => {
    expect(
      nextInPartOf(
        [
          { slug: 'a', done: true },
          { slug: 'b', done: false },
        ],
        'b',
      ),
    ).toBeNull();
    expect(nextInPartOf([{ slug: 'a', done: false }], 'a')).toBeNull();
  });
});

describe('what the lesson page does inside the plan', () => {
  it('names the plan, the round and the part on the strip, each a way back but the part', () => {
    const setting = lessonSettingOf(graphsInPlan, 'graphs-4', graphsTitles);
    expect(setting.crumbs).toEqual([
      { label: 'Interviews', href: '/interviews' },
      { label: 'Northwind · Senior software engineer', href: '/interviews/northwind/senior-software-engineer' },
      { label: 'Round 3 · Coding interviews', href: '/interviews/northwind/senior-software-engineer#round-3' },
      { label: 'Graphs' },
    ]);
    expect(setting.plan).toBe('northwind/senior-software-engineer');
    expect(setting.here).toBe('/learn/lessons/graphs-4?plan=northwind/senior-software-engineer');
    expect(setting.back).toEqual({ label: 'Back to the plan', href: '/interviews/northwind/senior-software-engineer' });
  });

  it('goes on to the next lesson of the part, inside the plan', () => {
    const setting = lessonSettingOf(graphsInPlan, 'graphs-4', graphsTitles);
    expect(setting.next).toEqual({
      label: 'Next: Graphs, lesson 5',
      href: '/learn/lessons/graphs-5?plan=northwind/senior-software-engineer',
    });
  });

  it('after the last lesson of the part, says the part is done and opens the connecting screen', () => {
    const setting = lessonSettingOf(graphsLastInPlan, 'graphs-11', graphsTitles);
    expect(setting.next).toEqual({
      label: 'Graphs is done. See what is next',
      href: '/interviews/northwind/senior-software-engineer/next?after=algorithms%2Fgraphs',
    });
    expect(setting.lineOf(true)).toEqual({ lead: 'Learned.', tail: 'That was the last lesson of Graphs.' });
    expect(setting.lineOf(false)).toEqual({ lead: 'Learned.', tail: 'That was the last lesson of Graphs.' });
    expect(setting.held).toBe(true);
  });

  it("says a held lesson is not repeated, and leaves Learn's own line when the course is the person's", () => {
    const setting = lessonSettingOf(graphsInPlan, 'graphs-4', graphsTitles);
    expect(setting.lineOf(true)).toEqual(HELD_LINE);
    expect(HELD_LINE).toEqual({ lead: 'Learned.', tail: 'Not repeated: it is part of your interview plan.' });
    expect(setting.lineOf(false)).toBeNull();
  });

  it("goes by the group's order when the person's lessons of the part did not come", () => {
    const setting = lessonSettingOf({ ...graphsInPlan, lessons: [] }, 'what-a-graph-is', graphsTitles);
    expect(setting.next.href).toBe('/learn/lessons/graphs-2?plan=northwind/senior-software-engineer');
  });

  it('says "Next lesson" when the next one has no title on the page', () => {
    expect(lessonSettingOf(graphsInPlan, 'graphs-4', []).next.label).toBe('Next lesson');
  });
});
