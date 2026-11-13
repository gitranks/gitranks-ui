import { describe, expect, it } from 'vitest';

import { myLessons } from './__fixtures__/profile';
import type { MyLesson } from './learn.types';
import { lessonPagePath, myLessonGroupsOf, myLessonRowOf } from './my-lessons';

const lesson = (patch: Partial<MyLesson>): MyLesson => ({
  slug: null,
  attemptId: 'A_9',
  title: 'A fix',
  repo: 'owner/repo',
  state: 'IN_PROGRESS',
  passedAt: null,
  ...patch,
});

describe('My lessons', () => {
  it("leads the user's own lesson to its attempt, and a shared one to the lesson's page", () => {
    expect(myLessonRowOf(lesson({ attemptId: 'A/1', slug: 'abc' })).href).toBe('/learn/attempts/A%2F1');
    const shared = myLessonRowOf(lesson({ attemptId: null, slug: 'retry jitter', state: 'PASSED' }));
    expect(shared.href).toBe(lessonPagePath('retry jitter'));
    expect(shared.href).toBe('/learn/lessons/retry%20jitter');
    expect(shared.meta).toBe('owner/repo · shared lesson');
    expect(shared.action).toBe('See the lesson');
  });

  it('has nowhere to go for a shared lesson taken down', () => {
    expect(myLessonRowOf(lesson({ attemptId: null, slug: 's', state: 'REMOVED' })).href).toBeNull();
    expect(myLessonRowOf(lesson({ state: 'REMOVED' })).href).toBe('/learn/attempts/A_9');
  });

  it('says what happened last and what the button does, per state', () => {
    expect(myLessonRowOf(lesson({}))).toMatchObject({ pill: { label: 'In progress' }, action: 'Continue' });
    expect(myLessonRowOf(lesson({ state: 'PASSED', passedAt: '2026-10-25T16:05:00.000Z' }))).toMatchObject({
      text: 'Passed Oct 25. The pull request waits for your approval.',
      action: 'Approve',
    });
    expect(myLessonRowOf(lesson({ state: 'PR_OPEN', passedAt: '2026-10-28T11:20:00.000Z' }))).toMatchObject({
      pill: { label: 'Pull request open', tone: 'green' },
      text: 'Passed Oct 28. The pull request is open, and the lesson is public.',
      action: 'Details',
    });
    expect(myLessonRowOf(lesson({ state: 'PASSED', attemptId: null, slug: 's', passedAt: 'nope' })).text).toBe(
      'Passed',
    );
    expect(myLessonRowOf(lesson({ state: 'ENDED' })).text).toBe('The attempt ended before a pull request.');
    expect(myLessonRowOf(lesson({ title: '  ' })).title).toBe('A lesson');
    expect(myLessonRowOf(lesson({ repo: null, attemptId: 'A_1' })).meta).toBeNull();
  });

  it('lists what is still going first, each list in the order the API gives', () => {
    const { going, done } = myLessonGroupsOf([
      ...myLessons,
      lesson({ attemptId: 'A_8', state: 'PASSED', passedAt: '2026-10-27T10:00:00.000Z' }),
    ]);
    expect(going.map(({ key }) => key)).toEqual(['A_3', 'A_8']);
    expect(done.map(({ key }) => key)).toEqual(['A_1', 'retry-backoff-jitter-2m9q', 'A_2']);
    expect(myLessonGroupsOf([])).toEqual({ going: [], done: [] });
  });
});
