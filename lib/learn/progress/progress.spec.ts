import { describe, expect, it } from 'vitest';

import { notFinished, passedLessons } from './__fixtures__/progress';
import {
  LEARN_PR_LABELS,
  lastPageOf,
  lessonViewPathOf,
  passedLineOf,
  progressLessonLinksOf,
  progressPageOf,
  progressPath,
  progressViewOf,
  pullRequestPageOf,
  repoLineOf,
  unfinishedRowOf,
} from './progress';
import type { LearnProgressLesson } from './progress.types';

const [openOwn, mergedOwn, practice] = passedLessons;
const takenDownOwn = passedLessons[4];
const takenDownPractice = passedLessons[6];

describe('Your progress’s address', () => {
  it('reads the view and the page, anything else as the first', () => {
    expect(progressViewOf(undefined)).toBe('lessons');
    expect(progressViewOf('learned')).toBe('learned');
    expect(progressViewOf(['merged', 'repos'])).toBe('merged');
    expect(progressViewOf('repos')).toBe('repos');
    expect(progressViewOf('LEARNED')).toBe('lessons');
    expect(progressViewOf('__proto__')).toBe('lessons');
    expect(progressPageOf('3')).toBe(3);
    for (const page of [undefined, '0', '-2', '1.5', 'x', '']) expect(progressPageOf(page), String(page)).toBe(1);
  });

  it('writes the first view and the first page without their parameter', () => {
    expect(progressPath()).toBe('/my/progress');
    expect(progressPath({ view: 'lessons', page: 1 })).toBe('/my/progress');
    expect(progressPath({ view: 'learned' })).toBe('/my/progress?view=learned');
    expect(progressPath({ view: 'merged', page: 3 })).toBe('/my/progress?view=merged&page=3');
    expect(progressPath({ page: 2 })).toBe('/my/progress?page=2');
  });

  it('knows the last page of 20 a page', () => {
    expect(lastPageOf(0)).toBe(1);
    expect(lastPageOf(20)).toBe(1);
    expect(lastPageOf(21)).toBe(2);
    expect(lastPageOf(143)).toBe(8);
  });
});

describe('LearnLessonStatePill’s labels', () => {
  it('has one word for each of the seven', () => {
    expect(Object.fromEntries(Object.entries(LEARN_PR_LABELS).map(([key, { label }]) => [key, label]))).toEqual({
      MERGED: 'Merged',
      CLOSED: 'Closed',
      OPEN: 'Open',
      OPENING: 'Opening',
      READY: 'Ready to submit',
      REWRITING: 'Being rewritten',
      ENDED: 'Ended',
    });
  });
});

describe('a passed lesson’s row', () => {
  it('says when it was passed and how many new things, nothing for none', () => {
    expect(passedLineOf(openOwn)).toBe('Passed Nov 12 · 3 new things learned');
    expect(passedLineOf({ ...openOwn, learned: openOwn.learned.slice(0, 1) })).toBe(
      'Passed Nov 12 · 1 new thing learned',
    );
    expect(passedLineOf(passedLessons[5])).toBe('Passed Oct 25');
  });

  it('opens an own lesson’s Lesson view and its pull request’s page', () => {
    expect(progressLessonLinksOf(mergedOwn)).toEqual({
      lesson: '/my/pull-requests/tidewave/tide/931/lesson',
      action: { href: '/my/pull-requests/tidewave/tide/931', label: 'Details' },
      note: null,
    });
  });

  it('opens a practice lesson’s page', () => {
    expect(progressLessonLinksOf(practice)).toEqual({
      lesson: '/learn/lessons/retry-backoff-jitter-2m9q',
      action: { href: '/learn/lessons/retry-backoff-jitter-2m9q', label: 'See the lesson' },
      note: null,
    });
  });

  it('keeps a lesson taken down, its title plain: an own one keeps Details, a practice one has no button', () => {
    expect(progressLessonLinksOf(takenDownOwn)).toEqual({
      lesson: null,
      action: { href: '/my/pull-requests/driftwood-js/driftwood/871', label: 'Details' },
      note: 'Taken down',
    });
    expect(progressLessonLinksOf(takenDownPractice)).toEqual({
      lesson: null,
      action: null,
      note: 'Its author took it down',
    });
    const hidden: LearnProgressLesson = { ...practice, visibility: 'HIDDEN' };
    expect(progressLessonLinksOf(hidden).note).toBe('Its author took it down');
    // A held page opens for no one: nothing to link, nothing to say.
    expect(progressLessonLinksOf({ ...practice, visibility: 'HELD' })).toEqual({
      lesson: null,
      action: null,
      note: null,
    });
  });

  it('links nothing without a repo of GitHub’s shape and a number', () => {
    expect(pullRequestPageOf(null, 3)).toBeNull();
    expect(pullRequestPageOf('acme/widgets', null)).toBeNull();
    expect(pullRequestPageOf('not a repo', 3)).toBeNull();
    expect(lessonViewPathOf('acme/widgets', 7)).toBe('/my/pull-requests/acme/widgets/7/lesson');
    expect(progressLessonLinksOf({ ...openOwn, repo: null })).toEqual({ lesson: null, action: null, note: null });
  });
});

describe('Not finished', () => {
  it('words a practice lesson started, and the two ways an own attempt ended', () => {
    expect(unfinishedRowOf(notFinished[0])).toEqual({
      text: 'Started Oct 22 · 2 of 5 steps passed',
      href: '/learn/lessons/submit-button-disabled-4t7n',
      action: 'Continue',
    });
    expect(unfinishedRowOf(notFinished[1])).toEqual({
      text: 'Ended Oct 12, before the lesson was written. No pull request.',
      href: '/my/pull-requests/quill-md/quill/188',
      action: 'Details',
    });
    expect(unfinishedRowOf({ ...notFinished[1], hasLesson: true }).text).toBe(
      'Ended Oct 12, before you passed the lesson. No pull request.',
    );
  });
});

describe('a repository’s row', () => {
  it('says how many were merged and when the last one was', () => {
    expect(repoLineOf({ merged: 2, lastMergedAt: '2026-11-09T10:00:00.000Z' })).toBe(
      '2 pull requests merged · last on Nov 9',
    );
    expect(repoLineOf({ merged: 1, lastMergedAt: '' })).toBe('1 pull request merged');
  });
});
