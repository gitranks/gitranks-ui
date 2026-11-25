import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fixesCountLineOf,
  fixKeyOf,
  fixLanguageWordsOf,
  readPassedFixes,
  realProjectsEndsOf,
  realProjectsTitleOf,
  realProjectsWordsOf,
  showMoreOf,
} from './real-projects';

describe('realProjectsEndsOf', () => {
  it.each([
    ['open rows and fixes', { own: 5, shared: 5, fixes: 12 }, { made: true, open: 'rows', fixed: 'rows' }],
    [
      'a visitor reads the shared list',
      { own: null, shared: 5, fixes: 0 },
      { made: true, open: 'rows', fixed: 'none' },
    ],
    [
      'no open issue at all, fixes: the dashed open end',
      { own: 0, shared: 0, fixes: 3 },
      { made: true, open: 'none', fixed: 'rows' },
    ],
    [
      "the person's own view has none while the shared list has some: the list's own ends",
      { own: 0, shared: 4, fixes: 0 },
      { made: true, open: 'narrowed', fixed: 'none' },
    ],
    [
      'a visitor, no open issue, a fix',
      { own: null, shared: 0, fixes: 1 },
      { made: true, open: 'none', fixed: 'rows' },
    ],
    ['neither: the page is not made', { own: 0, shared: 0, fixes: 0 }, { made: false, open: 'none', fixed: 'none' }],
  ] as const)('%s', (_case, read, ends) => {
    expect(realProjectsEndsOf(read)).toEqual(ends);
  });
});

describe('the fixes count', () => {
  it.each([
    [3, 3, null, null],
    [10, 10, null, null],
    [10, 23, 'Showing 10 of 23 fixes', 'Show 10 more'],
    [20, 23, 'Showing 20 of 23 fixes', 'Show 3 more'],
    [23, 23, '23 fixes', null],
    [10, 11, 'Showing 10 of 11 fixes', 'Show 1 more'],
  ])('%i of %i', (shown, total, count, more) => {
    expect(fixesCountLineOf(shown, total)).toBe(count);
    expect(showMoreOf(shown, total)).toBe(more);
  });
});

it('titles the page after the lesson', () => {
  expect(realProjectsTitleOf('Find duplicates in one pass with a set')).toBe(
    'Find duplicates in one pass with a set: in real projects',
  );
});

describe("a lesson's view and a course's", () => {
  it('words the top and the two ends for a lesson', () => {
    expect(realProjectsWordsOf('lesson')).toEqual({
      back: '← The lesson',
      sentence:
        'Open issues in real open-source projects that this lesson helps you fix, and merged fixes that used it.',
      openNone: { title: 'No open issue needs this lesson right now', text: 'New issues come in every day.' },
      fixedNone: {
        title: 'No fix yet',
        text: 'When someone fixes a real issue with this lesson and the fix is merged, it shows here.',
      },
    });
  });

  it('words them for a course, whose fixes used one of its lessons', () => {
    expect(realProjectsWordsOf('course')).toEqual({
      back: '← The course',
      sentence:
        'Open issues in real open-source projects that this course helps you fix, and merged fixes that used its lessons.',
      openNone: { title: 'No open issue needs this course right now', text: 'New issues come in every day.' },
      fixedNone: {
        title: 'No fix yet',
        text: 'When someone fixes a real issue with a lesson of this course and the fix is merged, it shows here.',
      },
    });
  });

  it('never words a long dash', () => {
    for (const of of ['lesson', 'course'] as const) expect(JSON.stringify(realProjectsWordsOf(of))).not.toContain('—');
  });
});

describe("a fix's row", () => {
  it('names its language as a person reads it, and leaves out one not known', () => {
    expect(fixLanguageWordsOf({ language: 'go' })).toBe('Go');
    expect(fixLanguageWordsOf({ language: 'javascript' })).toBe('JavaScript');
    for (const language of [null, undefined, '']) expect(fixLanguageWordsOf({ language })).toBeNull();
    expect(fixLanguageWordsOf({})).toBeNull();
  });

  it('keys a pull request by its project and number', () => {
    expect(fixKeyOf({ repo: 'acme/widgets', number: 36 })).toBe('acme/widgets#36');
  });
});

describe('the walkthroughs the person passed', () => {
  const row = (number: number) => ({
    fix: { repo: 'acme/widgets', issueNumber: 31, number, title: 'Use a set', fixer: 'hubot', lesson: null },
    passedAt: '2026-11-18T11:00:00Z',
  });
  const answer = (status: number, body: unknown) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

  afterEach(() => vi.restoreAllMocks());

  it('reads them from the signed-in route, never kept, as the keys the marks match', async () => {
    const fetch = answer(200, { walkthroughs: [row(36), row(40), {}] });
    expect(await readPassedFixes()).toEqual(new Set(['acme/widgets#36', 'acme/widgets#40']));
    expect(fetch).toHaveBeenCalledWith('/api/me/learn/progress/walkthroughs', { cache: 'no-store' });
  });

  it('marks nothing when signed out, on a failure and when the route answers none', async () => {
    answer(401, {});
    expect(await readPassedFixes()).toBeNull();
    answer(200, { walkthroughs: null });
    expect(await readPassedFixes()).toBeNull();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await readPassedFixes()).toBeNull();
  });

  it('marks none, with nothing passed yet', async () => {
    answer(200, { walkthroughs: [] });
    expect(await readPassedFixes()).toEqual(new Set());
  });
});
