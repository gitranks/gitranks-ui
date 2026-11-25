import { describe, expect, it } from 'vitest';

import { fixesCountLineOf, realProjectsEndsOf, realProjectsTitleOf, showMoreOf } from './real-projects';

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
