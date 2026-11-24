import { describe, expect, it } from 'vitest';

import { issueRows, learnFixes } from './__fixtures__/issues';
import { homeFixNeedsYou, landingFixes, myFixMerged, myFixOpen, myFixStarted } from './__fixtures__/real-issues';
import {
  ALL_FIXES_PATH,
  allFixesWordsOf,
  courseFixesCountOf,
  courseFixesPathOf,
  courseIssuesBoxWordsOf,
  FIX_ON_ITS_WAY_TAIL,
  fixBoxIssuesLineOf,
  fixBoxWordsOf,
  fixesOf,
  fixOnItsWay,
  homeRealOf,
  issuesBoxWordsOf,
  landingFixesLineOf,
  landingFixesOf,
  lessonFixesPathOf,
  lessonIssuesPathOf,
  lessonRealOf,
  myFixOf,
  myFixPathOf,
  myFixWordsOf,
  NO_HOME_REAL,
  openIssuesWordsOf,
  pullRequestRowOf,
  realRowsOf,
} from './real-issues';
import { prRow } from '@/lib/workspace/__fixtures__/pull-request';

const LONG_DASH = String.fromCodePoint(0x2014);

describe('real issues as the API answers them', () => {
  it("reads the person's fix, and takes a closed one, or one that is not, as none", () => {
    expect(myFixOf(myFixOpen)).toEqual(myFixOpen);
    expect(myFixOf({ ...myFixOpen, state: 'SOMETHING', at: '', number: 'x' })).toEqual({
      ...myFixOpen,
      state: null,
      at: null,
      number: null,
    });
    expect(myFixOf({ ...myFixOpen, state: 'CLOSED' })).toBeNull();
    for (const broken of [null, 'x', [], { ...myFixOpen, repo: 'norepo' }, { ...myFixOpen, title: ' ' }]) {
      expect(myFixOf(broken), JSON.stringify(broken)).toBeNull();
    }
  });

  it("reads a lesson's personal side, and none when the API answers none", () => {
    expect(lessonRealOf({ fix: myFixOpen, fixAnIssue: issueRows[0] })).toEqual({
      fix: myFixOpen,
      fixAnIssue: issueRows[0],
    });
    expect(lessonRealOf({ fix: null, fixAnIssue: null })).toEqual({ fix: null, fixAnIssue: null });
    expect(lessonRealOf(null)).toBeNull();
    expect(lessonRealOf(undefined)).toBeNull();
  });

  it("reads the person's rows, leaving out what is not a row, and none when there is no list", () => {
    expect(realRowsOf({ rows: [issueRows[0], { issue: null }, issueRows[1]] })).toEqual([issueRows[0], issueRows[1]]);
    expect(realRowsOf({ rows: [] })).toEqual([]);
    expect(realRowsOf(null)).toBeNull();
    expect(realRowsOf({ rows: null })).toBeNull();
  });

  it('reads merged fixes, leaving out what is not one', () => {
    expect(fixesOf(learnFixes)).toEqual(learnFixes);
    expect(fixesOf({ rows: [learnFixes.rows[0], { repo: 'a/b' }], total: 0, next: '' })).toEqual({
      rows: [learnFixes.rows[0]],
      total: 1,
      next: null,
    });
    expect(fixesOf(null)).toBeNull();
    expect(fixesOf({ rows: 'no' })).toBeNull();
  });

  it('reads a row of pull requests tolerantly, and none without its group', () => {
    const row = prRow('OPEN', { number: 440 });
    expect(pullRequestRowOf(row)).toEqual(row);
    expect(pullRequestRowOf({ ...row, issueUrl: null })?.issueUrl).toBe(
      'https://github.com/harbor-kit/relay/issues/431',
    );
    expect(pullRequestRowOf({ ...row, group: 'ELSEWHERE' })).toBeNull();
    expect(pullRequestRowOf({ ...row, since: null })).toBeNull();
    expect(pullRequestRowOf(null)).toBeNull();
  });
});

describe("Learn home's real issues", () => {
  const issuesRead = (openIssues: unknown, rows: unknown[] = issueRows) => ({
    thirdBox: { openIssues },
    issues: { rows },
  });
  const fixesRead = (needsYou: boolean, fixes = [homeFixNeedsYou]) => ({
    thirdBox: { needsYou, fix: needsYou ? homeFixNeedsYou : null },
    fixes,
  });

  it('makes a fix that needs the person the box, with the open issues a line under it', () => {
    const real = homeRealOf(issuesRead(5), fixesRead(true));
    expect(real.box).toEqual({ kind: 'fix', row: homeFixNeedsYou, openIssues: 5 });
    expect(real.fixes).toEqual([homeFixNeedsYou]);
    expect(real.issues).toEqual(issueRows);
  });

  it('else makes the open issues the box, and nothing at none', () => {
    expect(homeRealOf(issuesRead(5), fixesRead(false)).box).toEqual({ kind: 'issues', count: 5 });
    expect(homeRealOf(issuesRead(0), fixesRead(false)).box).toBeNull();
    expect(homeRealOf(issuesRead(null), null).box).toBeNull();
  });

  it('leaves out fixes that have ended', () => {
    const ended = prRow('MERGED', { attemptId: 'att_done' });
    expect(homeRealOf(null, fixesRead(false, [homeFixNeedsYou, ended])).fixes).toEqual([homeFixNeedsYou]);
  });

  it('is nothing when neither read answers, or what the other gives when one fails', () => {
    expect(homeRealOf(null, null)).toEqual(NO_HOME_REAL);
    expect(homeRealOf(undefined, 'x')).toEqual(NO_HOME_REAL);
    expect(homeRealOf(issuesRead(3), null)).toEqual({
      box: { kind: 'issues', count: 3 },
      fixes: [],
      issues: issueRows,
    });
    expect(homeRealOf(null, fixesRead(true))).toEqual({
      box: { kind: 'fix', row: homeFixNeedsYou, openIssues: null },
      fixes: [homeFixNeedsYou],
      issues: [],
    });
  });
});

describe('addresses', () => {
  it('leads only to pages that exist: the pull request page, Issues and its views', () => {
    expect(myFixPathOf(myFixOpen)).toBe('/my/pull-requests/harbor-kit/relay/431?from=learn');
    expect(ALL_FIXES_PATH).toBe('/learn/issues?fixed=1');
    expect(courseFixesPathOf('algorithms')).toBe('/learn/courses/algorithms/real-world?fixed=1');
    expect(lessonFixesPathOf('a-hash-map')).toBe('/learn/lessons/a-hash-map/real-world?fixed=1');
    expect(lessonIssuesPathOf('a-hash-map')).toBe('/learn/lessons/a-hash-map/real-world');
    for (const href of [ALL_FIXES_PATH, courseFixesPathOf('x'), lessonFixesPathOf('x')]) {
      expect(href).not.toContain('/learn/fixes');
    }
  });
});

describe('words', () => {
  it('counts open issues', () => {
    expect(openIssuesWordsOf(1)).toBe('One open issue');
    expect(openIssuesWordsOf(5)).toBe('5 open issues');
    expect(openIssuesWordsOf(0)).toBeNull();
    expect(openIssuesWordsOf(null)).toBeNull();
    expect(issuesBoxWordsOf(5).title).toBe('5 open issues for you');
    expect(courseIssuesBoxWordsOf(2).title).toBe('2 open issues for this course');
    expect(fixBoxIssuesLineOf(1)).toBe('One open issue fits you.');
    expect(fixBoxIssuesLineOf(5)).toBe('5 open issues fit you.');
    expect(fixBoxIssuesLineOf(null)).toBeNull();
  });

  it("says a fix that needs the person in its own page's words", () => {
    const words = fixBoxWordsOf(homeFixNeedsYou);
    expect(words.title.length).toBeGreaterThan(0);
    expect(words.button.length).toBeGreaterThan(0);
  });

  it("names a course's merged fixes from five", () => {
    expect(courseFixesCountOf(212)).toBe(212);
    expect(courseFixesCountOf(5)).toBe(5);
    for (const below of [4, 0, null, undefined]) expect(courseFixesCountOf(below)).toBeNull();
  });

  it("shows the landing's merged fixes from three, and how many from five", () => {
    expect(landingFixesOf(learnFixes)).toBeNull();
    expect(landingFixesOf(null)).toBeNull();
    expect(landingFixesOf(landingFixes)).toEqual({ rows: landingFixes.rows, total: 12 });
    expect(landingFixesOf({ ...landingFixes, total: 4 })).toEqual({ rows: landingFixes.rows, total: null });
    expect(landingFixesLineOf(640)).toBe('640 merged so far, each in the name of the person who learned from it.');
    expect(landingFixesLineOf(null)).toBe('Each in the name of the person who learned from it.');
  });

  it("says where the person's fix stands, and whether the lesson waits for it", () => {
    expect(myFixWordsOf(myFixOpen)).toMatchObject({ pill: 'pull request open', merged: false });
    expect(myFixWordsOf(myFixOpen).text).toContain('Pull request #440');
    expect(myFixWordsOf(myFixStarted)).toMatchObject({ pill: 'in progress', merged: false });
    expect(myFixWordsOf(myFixMerged)).toMatchObject({ pill: 'merged', merged: true });
    expect(fixOnItsWay(myFixOpen)).toBe(true);
    expect(fixOnItsWay(myFixStarted)).toBe(true);
    expect(fixOnItsWay(myFixMerged)).toBe(false);
    expect(fixOnItsWay(null)).toBe(false);
    expect(FIX_ON_ITS_WAY_TAIL).toBe('It becomes Mastered when your fix is merged.');
  });

  it('links all fixes only while more are there than shown', () => {
    expect(allFixesWordsOf(12, 3)).toBe('All 12 fixes');
    expect(allFixesWordsOf(3, 3)).toBeNull();
  });

  it('has no long dash', () => {
    const all = [
      issuesBoxWordsOf(2),
      courseIssuesBoxWordsOf(2),
      myFixWordsOf(myFixOpen),
      myFixWordsOf(myFixMerged),
      myFixWordsOf(myFixStarted),
      landingFixesLineOf(12),
    ];
    expect(JSON.stringify(all)).not.toContain(LONG_DASH);
  });
});
