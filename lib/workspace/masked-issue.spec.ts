import { describe, expect, it } from 'vitest';

import { HELD_UNTIL, looksAtLimit, looksToday, MASKED_NOW } from './__fixtures__/masked-issue';
import {
  BAN_TEXT,
  beforePressLineOf,
  GIVE_BACK_REASONS,
  heldLineOf,
  hintsShownOf,
  hintTextOf,
  issueKindOf,
  issuePagePath,
  languageColorOf,
  limitEndOf,
  limitNoteOf,
  looksLineOf,
  looksLongLineOf,
  minutesLeftOf,
  numbersLineOf,
  projectTierNameOf,
  SKIP_REASONS,
  starsTextOf,
  WHY_HIDDEN_CLOSING,
  WHY_HIDDEN_REASONS,
} from './masked-issue';

describe('the page of one issue', () => {
  it('is at an address that names only the mask id', () => {
    expect(issuePagePath('q7k2m9xa')).toBe('/my/issues/q7k2m9xa');
    expect(issuePagePath('a/b c')).toBe('/my/issues/a%2Fb%20c');
  });
});

describe('the facts of a masked issue', () => {
  it('names the six kinds in any spelling, and no other', () => {
    expect(issueKindOf('bug')).toBe('bug');
    expect(issueKindOf('PERFORMANCE')).toBe('performance');
    expect(issueKindOf(' Tests ')).toBe('tests');
    expect(issueKindOf('chore')).toBeNull();
    expect(issueKindOf(null)).toBeNull();
  });

  it("colours a language by the viewer's own colours, then GitHub's, then the site's grey", () => {
    expect(languageColorOf('TypeScript')).toBe('#3178c6');
    expect(languageColorOf('typescript', { typescript: '#000001' })).toBe('#000001');
    expect(languageColorOf('Zig')).toBe('#64748B');
    expect(languageColorOf(null)).toBe('#64748B');
  });

  it("names the project's rank tier, and none outside 1 to 7", () => {
    expect(projectTierNameOf(1)).toBe('Stardust');
    expect(projectTierNameOf(4)).toBe('Planet');
    expect(projectTierNameOf(7)).toBe('Supernova');
    expect(projectTierNameOf(0)).toBeNull();
    expect(projectTierNameOf(8)).toBeNull();
    expect(projectTierNameOf(null)).toBeNull();
  });

  it('words each hint as a good sign, with the count of fixes merged here', () => {
    expect(hintTextOf({ kind: 'AGREED', count: null })).toBe('A maintainer agreed it should be fixed');
    expect(hintTextOf({ kind: 'MERGES_OUTSIDE', count: null })).toBe('Merges outside pull requests');
    expect(hintTextOf({ kind: 'MERGED_HERE', count: 2 })).toBe('2 fixes merged here through GitRanks');
    expect(hintTextOf({ kind: 'MERGED_HERE', count: 1 })).toBe('1 fix merged here through GitRanks');
    expect(hintTextOf({ kind: 'MERGED_HERE', count: null })).toBe('Fixes merged here through GitRanks');
  });

  it('shows two hints at most, in the order they come', () => {
    const hints = [
      { kind: 'AGREED', count: null },
      { kind: 'MERGED_HERE', count: 3 },
      { kind: 'MERGES_OUTSIDE', count: null },
    ] as const;
    expect(hintsShownOf([...hints]).map((hint) => hint.kind)).toEqual(['AGREED', 'MERGED_HERE']);
  });

  it('writes the stars short, after the press', () => {
    expect(starsTextOf(18_400)).toBe('18.4k stars');
    expect(starsTextOf(950)).toBe('950 stars');
    expect(starsTextOf(1)).toBe('1 star');
    expect(starsTextOf(null)).toBeNull();
  });
});

describe('the full issues of a day', () => {
  it('says how many a day and how many are left', () => {
    expect(looksLineOf(looksToday())).toBe('You can see 20 full issues a day. 17 left today.');
    expect(looksLineOf(looksToday({ limit: 100, left: -1 }))).toBe('You can see 100 full issues a day. 0 left today.');
  });

  it('says what the day is made of, above a list', () => {
    expect(looksLongLineOf(looksToday())).toBe(
      'You can see 20 full issues a day: your GitRanks tier (Skilled) gives 20, and every pull request merged through GitRanks adds 5, up to 100. 17 left today.',
    );
    expect(looksLongLineOf(looksToday({ limit: 30, merged: 2 }))).toBe(
      'You can see 30 full issues a day: your GitRanks tier (Skilled) gives 20, and your 2 merged pull requests add 10. Every pull request merged through GitRanks adds 5, up to 100. 17 left today.',
    );
    expect(looksLongLineOf(looksToday({ tier: null, limit: 10, base: 10, left: 4 }))).toBe(
      'You can see 10 full issues a day: an account without a GitRanks tier gets 10, and every pull request merged through GitRanks adds 5, up to 100. 4 left today.',
    );
    expect(looksLongLineOf(looksToday({ limit: 5, left: 2, warned: true }))).toBe(
      'After a fair-use warning you can see 5 full issues a day. 2 left today.',
    );
  });

  it('says at the limit when more come, on the row and on the page', () => {
    expect(limitNoteOf(looksAtLimit)).toBe('You have seen 10 full issues today. More at 00:00 UTC.');
    expect(limitEndOf(looksAtLimit)).toEqual({
      title: 'You have seen 10 full issues today',
      text: 'That is the most for your GitRanks tier, Rookie. You can see more after 00:00 UTC. Every pull request merged through GitRanks adds 5 a day, up to 100.',
    });
    expect(limitEndOf(looksToday({ limit: 30, left: 0, merged: 2 })).text).toBe(
      'Your GitRanks tier, Skilled, gives 20, and your 2 merged pull requests add 10. You can see more after 00:00 UTC. Every pull request merged through GitRanks adds 5 a day, up to 100.',
    );
    expect(limitEndOf(looksToday({ limit: 5, left: 0, warned: true })).text).toBe(
      'A fair-use warning holds you at 5 a day. You can see more after 00:00 UTC.',
    );
  });
});

describe('the hold', () => {
  it('counts whole minutes left, rounded up, and none once past', () => {
    expect(minutesLeftOf(HELD_UNTIL, MASKED_NOW)).toBe(14);
    expect(minutesLeftOf(HELD_UNTIL, new Date('2026-10-28T12:13:30.000Z'))).toBe(1);
    expect(minutesLeftOf(HELD_UNTIL, new Date('2026-10-28T12:20:00.000Z'))).toBe(0);
  });

  it('writes the strip with the end and the minutes left', () => {
    expect(heldLineOf(HELD_UNTIL, MASKED_NOW, 'UTC')).toBe('Held for you until 12:14 · 14 minutes left');
    expect(heldLineOf(HELD_UNTIL, new Date('2026-10-28T12:13:30.000Z'), 'UTC')).toBe(
      'Held for you until 12:14 · 1 minute left',
    );
  });

  it('says before the press what it does, holding another issue or not', () => {
    expect(beforePressLineOf(null, MASKED_NOW)).toBe('Held for you for 15 minutes. You can give it back at any time.');
    expect(beforePressLineOf({ until: '2026-10-28T12:09:00.000Z' }, MASKED_NOW)).toBe(
      'You hold another issue for 9 more minutes. Seeing this one gives that one back.',
    );
  });
});

describe('the reasons', () => {
  it('offers six after giving back and two before a look', () => {
    expect(GIVE_BACK_REASONS.map((each) => each.reason)).toEqual([
      'TAKEN',
      'FIXED',
      'NOT_MY_PROJECT',
      'TOO_HARD',
      'UNCLEAR',
      'WRONG_MATCH',
    ]);
    expect(SKIP_REASONS.map((each) => each.text)).toEqual(['Too hard for me', 'Not interesting to me']);
  });
});

describe('why issue details are hidden', () => {
  it('opens with our numbers, the share as "about 1 in 1,000" while it is near it', () => {
    expect(numbersLineOf({ read: 2_707_100, kept: 3_138 })).toBe(
      'We read 2,707,100 open issues and kept 3,138 of them: about 1 in 1,000. Our own rules look first, then two AI models, Jev and Claude.',
    );
    expect(numbersLineOf({ read: 1_000_000, kept: 5_000 })).toContain('kept 5,000 of them: 0.5%.');
    expect(numbersLineOf({ read: 1_000_000, kept: 300 })).toContain('kept 300 of them: 0.03%.');
  });

  it('says how issues are chosen when the numbers are not there', () => {
    expect(numbersLineOf(null)).toBe(
      'We read open issues and keep very few of them. Our own rules look first, then two AI models, Jev and Claude.',
    );
  });

  it('gives three reasons, then that seeing one costs no money and counts toward the day', () => {
    expect(WHY_HIDDEN_REASONS.map((each) => each.title)).toEqual([
      'Finding them costs us a lot',
      'We made a promise to maintainers',
      'It is fair to you',
    ]);
    expect(WHY_HIDDEN_CLOSING).toContain('Seeing it costs no money, and it counts toward the full issues');
  });
});

describe('the words people read', () => {
  const ALL = [
    ...GIVE_BACK_REASONS.map((each) => each.text),
    ...SKIP_REASONS.map((each) => each.text),
    ...WHY_HIDDEN_REASONS.flatMap((each) => [each.title, each.text]),
    WHY_HIDDEN_CLOSING,
    BAN_TEXT,
    numbersLineOf({ read: 2_707_100, kept: 3_138 }),
    looksLongLineOf(looksToday()),
    limitEndOf(looksAtLimit).text,
    beforePressLineOf({ until: HELD_UNTIL }, MASKED_NOW),
  ];

  it('never use the long dash, and never say "claim"', () => {
    for (const words of ALL) {
      expect(words).not.toMatch(/—/);
      expect(words).not.toMatch(/claim/i);
    }
  });
});
