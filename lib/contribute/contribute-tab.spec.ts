import { describe, expect, it } from 'vitest';

import { limits, settings } from './__fixtures__/contribute-views';
import { introLineOf, limitReachedOf, numberTilesOf } from './contribute-tab';
import { isFiltered, issuesHref, issuesQueryOf } from '@/app/contribute/components/issues-filter';

describe("the Contribute tab's parts", () => {
  it('words the four numbers, the share of decided ones as a whole percent', () => {
    expect(numberTilesOf({ open: 2, merged: 7, closed: 4, reposHelped: 6 }).map(({ value }) => value)).toEqual([
      '7',
      '2',
      '6',
      '64%',
    ]);
    expect(numberTilesOf(null).map(({ value }) => value)).toEqual(['–', '–', '–', '–']);
  });

  it('is at the limit once what it counts reaches what holds: the setting, the cap, a limit set for the account', () => {
    expect(limitReachedOf({ prBound: 3 }, settings, limits.standard)).toEqual({ count: 3, limit: 3 });
    expect(limitReachedOf({ prBound: 2 }, settings, limits.standard)).toBeNull();
    expect(limitReachedOf({ prBound: 2 }, settings, limits.newAccount)).toEqual({ count: 2, limit: 2 });
    expect(limitReachedOf({ prBound: 3 }, settings, limits.openPrsSet)).toBeNull();
    expect(limitReachedOf(undefined, settings, limits.standard)).toBeNull();
  });

  it('says how Start works by the agents and the level', () => {
    expect(introLineOf({ hosted: true, own: true }, 'MANUAL').text).toContain('can also start the next one');
    expect(introLineOf({ hosted: true, own: false }, null).text).toContain('can also start the next one');
    expect(introLineOf({ hosted: true, own: false }, 'AUTOPILOT').text).toContain('also starts the next one by itself');
    expect(introLineOf({ hosted: false, own: true }, 'NEXT')).toEqual({
      text: 'Pick an issue and press Start.',
      agentLink: false,
    });
    expect(introLineOf({ hosted: false, own: false }, null).text).toContain('the next page connects your agent');
  });

  it('keeps the filters in the address of the tab, and drops an old page cursor', () => {
    expect(issuesQueryOf({ language: 'RUST', after: 'c2', kind: 'nope' })).toEqual({
      language: 'RUST',
      kind: undefined,
      size: undefined,
    });
    expect(issuesHref({ language: 'RUST', size: 'M' })).toBe('/contribute?language=RUST&size=M#issues');
    expect(issuesHref({})).toBe('/contribute#issues');
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ kind: 'DOCS' })).toBe(true);
  });
});
