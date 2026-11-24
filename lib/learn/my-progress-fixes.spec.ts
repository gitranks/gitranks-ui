import { describe, expect, it } from 'vitest';

import { historyFirst, myFixes, myWalkthroughs, PROGRESS_TODAY } from './__fixtures__/my-progress';
import {
  dayFixesOf,
  dayWalkthroughHrefOf,
  FIXED_ISSUES_PATH,
  fixesLineOf,
  fixLessonWordsOf,
  fixPagePathOf,
  fixPillOf,
  fixWalkthroughPathOf,
  MY_ISSUES_PATH,
  myFixesOf,
  myFixPagePath,
  myWalkthroughsOf,
  noFixLineOf,
  noWalkthroughLineOf,
  passedWordsOf,
  pullUrlOf,
  readersWordsOf,
  walkthroughsLineOf,
  withDayFixes,
} from './my-progress-fixes';

const LESSON = {
  slug: 'a-queue',
  title: 'A queue: first in, first out',
  course: 'algorithms',
  courseName: 'Algorithms',
};
const FIX = {
  repo: 'acme/widgets',
  issueNumber: 42,
  number: 57,
  title: 'Stop the cache from growing',
  state: 'MERGED',
  lesson: LESSON,
  mastered: true,
  readers: 3,
  at: '2026-11-20T15:30:00.000Z',
};

describe('Your fixes as the API answers them', () => {
  it('keeps a fix it can draw, and leaves out one with no pull request yet or of another shape', () => {
    expect(myFixesOf([FIX])).toEqual([FIX]);
    const out = [
      { ...FIX, number: null },
      { ...FIX, repo: 'widgets' },
      { ...FIX, state: 'DRAFT' },
      { ...FIX, at: 'soon' },
      { ...FIX, title: ' ' },
      null,
      'a fix',
    ];
    expect(myFixesOf([...out, FIX])).toEqual([FIX]);
    expect(myFixesOf(null)).toBeNull();
    expect(myFixesOf({})).toBeNull();
  });

  it('reads a lesson only with its slug and title, readers only above zero, mastered only when true', () => {
    const [row] = myFixesOf([{ ...FIX, lesson: { slug: 'x' }, readers: 0, mastered: 'yes' }]) ?? [];
    expect(row).toMatchObject({ lesson: null, readers: null, mastered: false });
  });
});

describe('Walkthroughs as the API answers them', () => {
  const row = (passedAt: string, number = 36) => ({
    fix: { repo: 'acme/widgets', issueNumber: 31, number, title: 'Use a set', fixer: 'hubot', lesson: LESSON },
    passedAt,
  });

  it('lists the newest first, leaving out one it cannot draw', () => {
    const rows = myWalkthroughsOf([row('2026-11-18T11:00:00Z'), row('2026-11-21T18:00:00Z'), row('later'), {}]);
    expect(rows?.map((each) => each.passedAt)).toEqual(['2026-11-21T18:00:00Z', '2026-11-18T11:00:00Z']);
    expect(myWalkthroughsOf(undefined)).toBeNull();
  });
});

describe("a day's fixes and walkthroughs", () => {
  const walkthrough = { repo: 'acme/widgets', issueNumber: 31, title: 'Use a set', fixer: 'hubot', lesson: null };

  it("keeps another person's fix once its pull request is open, and the person's own one before it is sent", () => {
    const byDay = dayFixesOf([
      {
        day: '2026-11-21',
        fixesMerged: [{ repo: 'acme/widgets', issueNumber: 42, number: 57, title: 'Stop the cache', lesson: null }],
        walkthroughs: [
          { ...walkthrough, number: 36, mine: false },
          { ...walkthrough, number: null, mine: false },
          { ...walkthrough, number: null, mine: true },
        ],
      },
      { day: '2026-11-20' },
      { fixesMerged: [] },
    ]);
    expect(byDay?.get('2026-11-21')?.fixesMerged).toHaveLength(1);
    expect(byDay?.get('2026-11-21')?.walkthroughs.map((each) => [each.number, each.mine])).toEqual([
      [36, false],
      [null, true],
    ]);
    expect(byDay?.get('2026-11-20')).toEqual({ fixesMerged: [], walkthroughs: [] });
    expect(dayFixesOf(null)).toBeNull();
  });

  it('adds them to the days they belong to, and leaves the days as they were when they are not known', () => {
    const byDay = dayFixesOf([{ day: '2026-11-22', fixesMerged: [], walkthroughs: [] }]);
    const [today, saturday] = withDayFixes(historyFirst.days, byDay);
    expect(today).toMatchObject({ fixesMerged: [], walkthroughs: [] });
    expect(saturday).not.toHaveProperty('fixesMerged');
    expect(withDayFixes(historyFirst.days, null)).toEqual(historyFirst.days);
  });

  it("leads another person's walkthrough to their fix's page, and the person's own to their pull request", () => {
    const other = { ...walkthrough, number: 36, mine: false };
    expect(dayWalkthroughHrefOf(other)).toBe('/learn/fixes/acme/widgets/36');
    expect(dayWalkthroughHrefOf({ ...other, number: null, mine: true })).toBe(myFixPagePath(other));
  });
});

describe('Your fixes: what the view says', () => {
  it('counts the merged ones by project, then the open and closed ones', () => {
    expect(fixesLineOf(myFixes)).toEqual({ merged: 3, projects: 3, open: 1, closed: 1 });
    expect(fixesLineOf([])).toBeNull();
  });

  it('says what a fix did to its lesson: Uses while open, Mastered only for the fix that made it so', () => {
    const [open, mastered, merged, noLesson, closed] = myFixes;
    expect(fixLessonWordsOf(open)?.after).toBe('. It becomes Mastered when the fix is merged.');
    expect(fixLessonWordsOf(mastered)).toMatchObject({ before: 'Used ', after: '. It is Mastered now.' });
    expect(fixLessonWordsOf(merged)).toMatchObject({ before: 'Used ', after: '.' });
    expect(fixLessonWordsOf(closed)).toMatchObject({ before: 'Used ', after: '.' });
    expect(fixLessonWordsOf(noLesson)).toBeNull();
  });

  it("says where a fix's pull request stands, on the browser's day", () => {
    const [open, mastered, , , closed] = myFixes;
    expect(fixPillOf(open, PROGRESS_TODAY)).toEqual({ words: 'open, in review', tone: 'OPEN' });
    expect(fixPillOf(mastered, PROGRESS_TODAY).words).toMatch(/^merged /);
    expect(fixPillOf(closed, PROGRESS_TODAY)).toMatchObject({ tone: 'CLOSED' });
  });

  it('names the readers of a walkthrough only when there are some', () => {
    expect(readersWordsOf(3)).toBe('3 people read your walkthrough.');
    expect(readersWordsOf(1)).toBe('1 person read your walkthrough.');
    expect(readersWordsOf(null)).toBeNull();
  });

  it('with no fix yet, says how many open issues fit, or that none does', () => {
    expect(noFixLineOf(12)).toBe('A merged fix of your own moves a lesson to Mastered. 12 open issues fit you now.');
    expect(noFixLineOf(1)).toContain('1 open issue fits you now.');
    expect(noFixLineOf(4000)).toContain('1,000+ open issues fit you now.');
    expect(noFixLineOf(0)).toContain('No open issue fits you right now.');
    expect(noFixLineOf(null)).toContain('No open issue fits you right now.');
  });
});

describe('Walkthroughs: what the view says', () => {
  it("counts the walkthroughs of other people's fixes passed", () => {
    expect(walkthroughsLineOf(myWalkthroughs)).toEqual({
      count: 2,
      words: 'walkthroughs of other people’s fixes passed',
    });
    expect(walkthroughsLineOf(myWalkthroughs.slice(0, 1))?.words).toBe('walkthrough of other people’s fixes passed');
    expect(walkthroughsLineOf([])).toBeNull();
  });

  it('says the day one was passed, and with none, the merged fixes that have one', () => {
    expect(passedWordsOf('2026-11-21T18:00:00.000Z', PROGRESS_TODAY)).toMatch(/^passed /);
    expect(noWalkthroughLineOf(5)).toBe(
      'A walkthrough is a few questions about one real fix that was merged. 5 fixes have one.',
    );
    expect(noWalkthroughLineOf(1)).toContain('1 fix has one.');
    expect(noWalkthroughLineOf(null)).toContain('The first ones appear as fixes get merged.');
  });
});

describe("the fixes' addresses", () => {
  it("are built by Learn's paths: the person's pull request page, the fix's page and walkthrough, GitHub's pull request", () => {
    const fix = { repo: 'acme/widgets', issueNumber: 42, number: 57 };
    expect(myFixPagePath(fix)).toBe('/my/pull-requests/acme/widgets/42?from=learn');
    expect(fixPagePathOf(fix)).toBe('/learn/fixes/acme/widgets/57');
    expect(fixWalkthroughPathOf(fix)).toBe('/learn/fixes/acme/widgets/57/walkthrough');
    expect(pullUrlOf(fix)).toBe('https://github.com/acme/widgets/pull/57');
    expect(MY_ISSUES_PATH).toBe('/learn/issues');
    expect(FIXED_ISSUES_PATH).toContain('/learn/issues?');
  });
});
