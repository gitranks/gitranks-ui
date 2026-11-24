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
  issueLanguageColorOf,
  issuePageBackOf,
  issuePageCarriedOf,
  issuePageHrefOf,
  issuePagePath,
  keptShareOf,
  limitEndOf,
  limitNoteOf,
  looksLineOf,
  looksLongLineOf,
  minutesLeftOf,
  numbersLineOf,
  projectTierNameOf,
  SKIP_REASONS,
  starsTextOf,
  usesLearnOf,
  WHY_HIDDEN_CLOSING,
  WHY_HIDDEN_REASONS,
} from './masked-issue';
import { emptyProfile, filledProfile } from '@/lib/learn/__fixtures__/profile';

describe('the page of one issue', () => {
  it('is at an address that names only the mask id', () => {
    expect(issuePagePath('q7k2m9xa')).toBe('/my/issues/q7k2m9xa');
    expect(issuePagePath('a/b c')).toBe('/my/issues/a%2Fb%20c');
  });

  it("is where Contribute's home sends a new account back once it is set up, with the press it made", () => {
    expect(issuePageCarriedOf({ issue: 'q7k2m9xa', from: 'learn', look: '1' })).toBe(
      '/my/issues/q7k2m9xa?from=learn&look=1',
    );
    expect(issuePageCarriedOf({ issue: 'q7k2m9xa' })).toBe('/my/issues/q7k2m9xa?from=contribute');
    // A Learn view's filters, checked again; none from Contribute, and nothing but the filters.
    expect(issuePageCarriedOf({ issue: 'q7k2m9xa', from: 'learn', view: 'lesson=a-queue&at=lesson&x=1' })).toBe(
      '/my/issues/q7k2m9xa?from=learn&lesson=a-queue&at=lesson',
    );
    expect(issuePageCarriedOf({ issue: 'q7k2m9xa', from: 'contribute', view: 'lesson=a-queue' })).toBe(
      '/my/issues/q7k2m9xa?from=contribute',
    );
    expect(issuePageCarriedOf({ issue: 'q7k2m9xa', from: 'learn', view: ['lesson=a', 'lesson=b'] })).toBe(
      '/my/issues/q7k2m9xa?from=learn',
    );
    expect(issuePageCarriedOf({ issue: '../x' })).toBeNull();
    expect(issuePageCarriedOf({ issue: ['a', 'b'] })).toBeNull();
    expect(issuePageCarriedOf({})).toBeNull();
  });
});

describe('the way to the page of one issue, and back from it', () => {
  it("carries where the person came from, and from Learn the Issues view's filters alone", () => {
    expect(issuePageHrefOf('q7k2m9xa', 'contribute')).toBe('/my/issues/q7k2m9xa?from=contribute');
    expect(issuePageHrefOf('q7k2m9xa', 'learn', false, 'lesson=a-queue&for-you=0')).toBe(
      '/my/issues/q7k2m9xa?from=learn&lesson=a-queue&for-you=0',
    );
    expect(issuePageHrefOf('q7k2m9xa', 'learn', true, 'course=data-structures')).toBe(
      '/my/issues/q7k2m9xa?from=learn&course=data-structures&look=1',
    );
    // Nothing but the view's own filters, of their own shape; and never from Contribute.
    expect(issuePageHrefOf('q7k2m9xa', 'learn', false, 'next=https://evil.example&from=contribute&lesson=../x')).toBe(
      '/my/issues/q7k2m9xa?from=learn',
    );
    expect(issuePageHrefOf('q7k2m9xa', 'contribute', false, 'lesson=a-queue')).toBe(
      '/my/issues/q7k2m9xa?from=contribute',
    );
  });

  const back = (search: string, usesLearn = false) => {
    const query = new URLSearchParams(search);
    return issuePageBackOf(query.get('from') ?? undefined, query, usesLearn).href;
  };

  it("leads from Learn to Learn's Issues page, with the filters the address carries", () => {
    expect(back('from=learn')).toBe('/learn/issues');
    expect(back('from=learn&lesson=a-queue&language=go&learned=1&look=1')).toBe(
      '/learn/issues?lesson=a-queue&language=go&learned=1',
    );
    expect(back('from=learn&lesson=A%20Queue&back=%2F%2Fevil.example')).toBe('/learn/issues');
  });

  it("leads from a lesson's or a course's own view of Issues back to that page", () => {
    expect(back('from=learn&lesson=a-queue&learned=1&at=lesson')).toBe('/learn/lessons/a-queue/real-world?learned=1');
    expect(back('from=learn&course=algorithms&at=course')).toBe('/learn/courses/algorithms/real-world');
    expect(back('from=learn&at=lesson')).toBe('/learn/issues');
  });

  it('knows a person uses Learn by a Learn profile they saved, not by the empty one the API answers', () => {
    expect(usesLearnOf(filledProfile)).toBe(true);
    expect(usesLearnOf({ ...emptyProfile, goalKind: 'LANGUAGE' })).toBe(true);
    expect(usesLearnOf({ ...emptyProfile, updatedAt: '2026-10-27T18:00:00.000Z' })).toBe(true);
    expect(usesLearnOf(emptyProfile)).toBe(false);
    expect(usesLearnOf(null)).toBe(false);
    expect(usesLearnOf(undefined)).toBe(false);
  });

  it("leads from Contribute to Contribute's issues, whoever the person is", () => {
    expect(back('from=contribute')).toBe('/contribute#issues');
    expect(back('from=contribute&lesson=a-queue', true)).toBe('/contribute#issues');
  });

  it("leads, when the address does not say, to Learn's Issues for a person who uses Learn, else to Contribute's", () => {
    expect(back('', true)).toBe('/learn/issues');
    expect(back('')).toBe('/contribute#issues');
    expect(back('from=elsewhere', true)).toBe('/learn/issues');
    expect(back('from=elsewhere')).toBe('/contribute#issues');
    expect(issuePageBackOf(undefined, new URLSearchParams(), false)).toEqual({
      href: '/contribute#issues',
      label: 'Issues',
    });
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
    expect(issueLanguageColorOf('TypeScript')).toBe('#3178c6');
    expect(issueLanguageColorOf('typescript', { typescript: '#000001' })).toBe('#000001');
    expect(issueLanguageColorOf('Zig')).toBe('#64748B');
    expect(issueLanguageColorOf(null)).toBe('#64748B');
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

describe('keptShareOf', () => {
  it('says "about 1 in 1,000" in its band, a share otherwise, and nothing before a read', () => {
    expect(keptShareOf({ read: 2_340_000, kept: 2_499 })).toBe('about 1 in 1,000');
    expect(keptShareOf({ read: 1_000_000, kept: 5_000 })).toBe('0.5%');
    expect(keptShareOf({ read: 0, kept: 0 })).toBeNull();
    expect(keptShareOf(null)).toBeNull();
  });
});
