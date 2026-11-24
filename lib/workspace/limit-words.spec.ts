import { describe, expect, it } from 'vitest';

import { limitLineOf, limitReachedOf, limitWordsOf } from './limit-words';
import { limits, settings } from '@/lib/contribute/__fixtures__/contribute-views';

const said = (counts: Parameters<typeof limitWordsOf>[0]) => {
  const { lead, rest } = limitWordsOf(counts);
  return `${lead} ${rest}`;
};

describe('the one sentence for the open pull request limit', () => {
  it('says the pull requests wait on maintainers when all of them are open', () => {
    expect(said({ count: 8, limit: 8, open: 8 })).toBe(
      '8 of your pull requests are waiting on maintainers. A new one can start when one is merged or closed.',
    );
    expect(said({ count: 1, limit: 1 })).toBe(
      '1 of your pull requests is waiting on maintainers. A new one can start when one is merged or closed.',
    );
  });

  it('says which wait on the user when some are not open yet', () => {
    expect(said({ count: 8, limit: 8, open: 6 })).toBe(
      '8 of your pull requests are open or on their way. 6 wait on maintainers, 2 on you. A new one can start when one is merged, closed or discarded.',
    );
    expect(said({ count: 2, limit: 2, open: 1 })).toContain('1 waits on maintainers, 1 on you.');
  });

  it('says it without a number when the count is not known', () => {
    expect(said({ count: 0, limit: 8 })).toBe(
      'Your open pull requests are waiting on maintainers. A new one can start when one is merged or closed.',
    );
  });

  it("words the Pull requests tab's line", () => {
    expect(limitLineOf({ count: 3, limit: 8, open: 3 })).toBe('3 of 8 open at a time');
    expect(limitLineOf({ count: 3, limit: 8 })).toBe('3 of 8 open at a time');
    expect(limitLineOf({ count: 8, limit: 8, open: 6 })).toBe('8 of 8 open or on their way');
  });
});

describe('the open pull request limit reached', () => {
  it('is at the limit once what it counts reaches what holds: the setting, or the limit the API answers', () => {
    expect(limitReachedOf({ prBound: 3 }, settings, limits.standard)).toEqual({ count: 3, limit: 3 });
    expect(limitReachedOf({ prBound: 2 }, settings, limits.standard)).toBeNull();
    expect(limitReachedOf({ prBound: 2 }, settings, { ...limits.standard, openPrsEffective: 2 })).toEqual({
      count: 2,
      limit: 2,
    });
    expect(limitReachedOf({ prBound: 3 }, settings, limits.openPrsSet)).toBeNull();
    expect(limitReachedOf(undefined, settings, limits.standard)).toBeNull();
  });
});
