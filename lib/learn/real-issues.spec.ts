import { describe, expect, it } from 'vitest';

import { issueRows, learnFixes } from './__fixtures__/issues';
import {
  homeFixMerged,
  homeFixNeedsYou,
  homeFixOpen,
  homeFixWorking,
  homeMergedFix,
  landingFixes,
  myFixMerged,
  myFixOpen,
  myFixStarted,
} from './__fixtures__/real-issues';
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
  homeFixStateOf,
  homeRealOf,
  issuesBoxWordsOf,
  landingFixesLineOf,
  landingFixesOf,
  lessonFixesPathOf,
  lessonIssuesPathOf,
  lessonRealOf,
  mergedBoxWordsOf,
  mergedFixOf,
  myFixOf,
  myFixPathOf,
  myFixWordsOf,
  NO_HOME_REAL,
  NO_ISSUES_BOX_WORDS,
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

  it("reads the person's merged fix, and none for one not merged", () => {
    expect(mergedFixOf(homeMergedFix)).toEqual(homeMergedFix);
    expect(mergedFixOf({ ...homeMergedFix, mastered: null })).toEqual({ ...homeMergedFix, mastered: false });
    // A fix with no state has no pull request yet: never "merged".
    expect(mergedFixOf({ ...homeMergedFix, state: null })).toBeNull();
    // No pull request number is needed: the box names none.
    expect(mergedFixOf({ ...homeMergedFix, number: null })).toEqual({ ...homeMergedFix, number: null });
    for (const broken of [
      null,
      { ...homeMergedFix, state: 'OPEN' },
      { ...homeMergedFix, state: 'CLOSED' },
      { ...homeMergedFix, repo: 'norepo' },
    ]) {
      expect(mergedFixOf(broken), JSON.stringify(broken)).toBeNull();
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
  const issuesRead = (openIssues: unknown, rows: unknown[] = issueRows, email: object = {}) => ({
    thirdBox: { openIssues },
    issues: { rows, emailOn: false, emailTo: 'octocat@example.com', ...email },
  });
  const fixesRead = (needsYou: boolean, fixes: unknown[] = [homeFixNeedsYou]) => ({
    thirdBox: { needsYou, fix: needsYou ? homeFixNeedsYou : null },
    fixes,
  });

  it('makes a fix that needs the person the box, with the open issues a line under it', () => {
    const real = homeRealOf(issuesRead(5), fixesRead(true));
    expect(real.box).toEqual({ kind: 'fix', row: homeFixNeedsYou, state: 'needs-you', openIssues: 5 });
    expect(real.fixes).toEqual([homeFixNeedsYou]);
    expect(real.issues).toEqual(issueRows);
  });

  it('follows a fix of theirs to its end: working, its pull request open, merged when the API sends it', () => {
    for (const [row, state] of [
      [homeFixWorking, 'working'],
      [homeFixOpen, 'open'],
      [homeFixMerged, 'merged'],
    ] as const) {
      expect(homeRealOf(issuesRead(5), fixesRead(false, [row])).box, state).toEqual({
        kind: 'fix',
        row,
        state,
        openIssues: 5,
      });
    }
    // A fix that needs them comes first, whatever the order; one that ended unmerged is no fix to follow.
    expect(homeRealOf(null, fixesRead(false, [homeFixOpen, homeFixNeedsYou])).box).toMatchObject({
      state: 'needs-you',
    });
    const closed = prRow('CLOSED', { attemptId: 'att_closed' });
    expect(homeRealOf(issuesRead(2), fixesRead(false, [closed])).box).toEqual({ kind: 'issues', count: 2 });
    expect(homeFixStateOf(closed)).toBeNull();
  });

  it('makes the fix merged in the last 7 days the box, after a fix that needs the person', () => {
    const mergedRead = { thirdBox: { needsYou: false, merged: homeMergedFix } };
    expect(homeRealOf(issuesRead(5), fixesRead(false, []), mergedRead).box).toEqual({
      kind: 'merged',
      fix: homeMergedFix,
    });
    // Before a fix followed to its end, or the count; with the issues' and fixes' reads failing too.
    expect(homeRealOf(issuesRead(5), fixesRead(false, [homeFixOpen]), mergedRead).box).toMatchObject({
      kind: 'merged',
    });
    expect(homeRealOf(null, null, mergedRead).box).toEqual({ kind: 'merged', fix: homeMergedFix });
    // A fix that needs the person wins the box, from the box's own fix or from their rows.
    expect(homeRealOf(issuesRead(5), fixesRead(true), mergedRead).box).toMatchObject({
      kind: 'fix',
      state: 'needs-you',
    });
    expect(homeRealOf(null, fixesRead(false, [homeFixOpen, homeFixNeedsYou]), mergedRead).box).toMatchObject({
      kind: 'fix',
      state: 'needs-you',
    });
  });

  it("is today's box when the merged fix's read answers none, or fails (an API without it)", () => {
    const today = homeRealOf(issuesRead(5), fixesRead(false, [homeFixOpen]));
    expect(today.box).toMatchObject({ kind: 'fix', state: 'open' });
    for (const mergedRead of [null, undefined, { thirdBox: { merged: null } }, { thirdBox: null }, 'x']) {
      expect(homeRealOf(issuesRead(5), fixesRead(false, [homeFixOpen]), mergedRead), String(mergedRead)).toEqual(today);
    }
  });

  it('never makes the merged fix the box while any read says a fix needs the person', () => {
    const mergedRead = (needsYou: unknown) => ({ thirdBox: { needsYou, merged: homeMergedFix } });
    // The fixes' read failed, and the merged read says a fix needs them: today's box (the count).
    expect(homeRealOf(issuesRead(5), null, mergedRead(true)).box).toEqual({ kind: 'issues', count: 5 });
    // The merged read does not say (a malformed answer): no merged box either.
    expect(homeRealOf(issuesRead(5), null, { thirdBox: { merged: homeMergedFix } }).box).toEqual({
      kind: 'issues',
      count: 5,
    });
    // The fixes' read says a fix needs them, but its fix could not be read: no merged box.
    const unreadable = { thirdBox: { needsYou: true, fix: { ...homeFixNeedsYou, group: 'ELSEWHERE' } }, fixes: [] };
    expect(homeRealOf(issuesRead(5), unreadable, mergedRead(false)).box).toEqual({ kind: 'issues', count: 5 });
    // A needs-you fix in the rows wins as before, even when the merged read says none needs them.
    expect(homeRealOf(null, fixesRead(false, [homeFixNeedsYou]), mergedRead(false)).box).toMatchObject({
      kind: 'fix',
      state: 'needs-you',
    });
  });

  it('makes the box of a person with nothing the quiet box: never a zero, never taken for something', () => {
    // The box the API answers for every signed-in person, with nothing in it.
    const nothing = { needsYou: false, openIssues: null, fix: null, merged: null };
    const real = homeRealOf(
      { thirdBox: nothing, issues: { rows: [], emailOn: false, emailTo: null } },
      { thirdBox: nothing, fixes: [] },
      { thirdBox: nothing },
    );
    expect(real).toEqual({ box: { kind: 'none', emailOn: false, emailTo: null }, fixes: [], issues: [] });
    const zero = homeRealOf({ thirdBox: { ...nothing, openIssues: 0 }, issues: { rows: [] } }, null, {
      thirdBox: nothing,
    });
    expect(zero.box).toEqual({ kind: 'none', emailOn: false, emailTo: null });
  });

  it('else makes the open issues the box, and the quiet box with the email at none', () => {
    expect(homeRealOf(issuesRead(5), fixesRead(false, [])).box).toEqual({ kind: 'issues', count: 5 });
    expect(homeRealOf(issuesRead(0, []), fixesRead(false, [])).box).toEqual({
      kind: 'none',
      emailOn: false,
      emailTo: 'octocat@example.com',
    });
    expect(homeRealOf(issuesRead(null, [], { emailOn: true, emailTo: null }), null).box).toEqual({
      kind: 'none',
      emailOn: true,
      emailTo: null,
    });
  });

  it('leaves out fixes that have ended from the rows', () => {
    const ended = prRow('MERGED', { attemptId: 'att_done' });
    expect(homeRealOf(null, fixesRead(false, [homeFixNeedsYou, ended])).fixes).toEqual([homeFixNeedsYou]);
  });

  it('is nothing when neither read answers, or what the other gives when one fails', () => {
    expect(homeRealOf(null, null)).toEqual(NO_HOME_REAL);
    expect(homeRealOf(undefined, 'x')).toEqual(NO_HOME_REAL);
    // An issues' read without its box or its list: no box, never a zero.
    expect(homeRealOf({ issues: { rows: [] } }, null).box).toBeNull();
    expect(homeRealOf(issuesRead(3), null)).toEqual({
      box: { kind: 'issues', count: 3 },
      fixes: [],
      issues: issueRows,
    });
    expect(homeRealOf(null, fixesRead(true))).toEqual({
      box: { kind: 'fix', row: homeFixNeedsYou, state: 'needs-you', openIssues: null },
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

  it("says where the person's fix stands, as the board does", () => {
    expect(fixBoxWordsOf(homeFixNeedsYou, 'needs-you')).toEqual({
      eyebrow: 'Your fix needs you',
      title: 'Round 2 is ready: your agent made the change',
      text: 'Your agent made the change. Read it, then approve it.',
      button: { label: 'Read and approve', to: 'fix' },
    });
    expect(fixBoxWordsOf(homeFixWorking, 'working')).toMatchObject({
      title: 'Your agent is working on it',
      text: 'Nothing to do yet. We tell you when the fix walkthrough is ready.',
      button: { label: 'Open your contribution', to: 'fix' },
    });
    expect(fixBoxWordsOf(homeFixOpen, 'open')).toMatchObject({
      title: 'Pull request open',
      text: 'Waiting for a maintainer. The lesson becomes Mastered when it is merged.',
      button: { label: 'Open your contribution', to: 'fix' },
    });
    expect(fixBoxWordsOf({ ...homeFixOpen, lesson: null }, 'open').text).toBe('Waiting for a maintainer.');
    expect(fixBoxWordsOf(homeFixMerged, 'merged')).toEqual({
      eyebrow: 'Your fix',
      title: 'Your fix was merged',
      text: '\u201cFind duplicates in one pass with a set\u201d is now Mastered.',
      button: { label: 'See your Skills page', to: 'skills' },
    });
    // No step count is read: the walkthrough's words name none.
    expect(fixBoxWordsOf(prRow('WALKTHROUGH'), 'needs-you').text).not.toMatch(/\d/);
  });

  it('says a merged fix made its lesson Mastered only when it did', () => {
    expect(mergedBoxWordsOf(homeMergedFix)).toEqual({
      eyebrow: 'Your fix',
      title: 'Your fix was merged',
      text: '“Find duplicates in one pass with a set” is now Mastered.',
      button: 'See your Skills page',
    });
    expect(mergedBoxWordsOf({ ...homeMergedFix, mastered: false }).text).toBe('The project has your fix now.');
    expect(mergedBoxWordsOf({ ...homeMergedFix, lesson: null }).text).toBe('The project has your fix now.');
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
      NO_ISSUES_BOX_WORDS,
      fixBoxWordsOf(homeFixMerged, 'merged'),
      fixBoxWordsOf(homeFixWorking, 'working'),
      courseIssuesBoxWordsOf(2),
      myFixWordsOf(myFixOpen),
      myFixWordsOf(myFixMerged),
      myFixWordsOf(myFixStarted),
      landingFixesLineOf(12),
      mergedBoxWordsOf(homeMergedFix),
      mergedBoxWordsOf({ ...homeMergedFix, mastered: false }),
    ];
    expect(JSON.stringify(all)).not.toContain(LONG_DASH);
  });
});
