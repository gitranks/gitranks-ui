import { describe, expect, it } from 'vitest';

import {
  pullRequestApprovalOf,
  pullRequestListOf,
  pullRequestPageOf,
  pullRequestRowOf,
  sitePathOf,
} from './pull-request-read';

const PAGE = {
  attemptId: 'A_1',
  made: 'LEARN',
  hosted: false,
  agent: 'Claude Code',
  repo: 'acme/widgets',
  issueNumber: 42,
  issueTitle: 'Empty names break the list',
  issueUrl: 'https://github.com/acme/widgets/issues/42',
  number: 57,
  url: 'https://github.com/acme/widgets/pull/57',
  lesson: { slug: 'go-retries', title: 'Retries in Go', course: 'go', courseName: 'Go' },
  lessonConfirmed: true,
  stages: ['FIX', 'WALKTHROUGH', 'APPROVE', 'REVIEW', 'MERGED'],
  stage: 'REVIEW',
  working: false,
  box: 'ROUND_WAITING',
  round: 2,
  openingStep: null,
  autoSend: false,
  stoppedAtLimit: false,
  onlyYou: [],
  change: { summary: 'Skips empty names', files: 2, added: 10, removed: 3 },
  walkthrough: { questions: 6, answered: 6, passedAt: '2026-10-27T10:00:00.000Z', readers: 3, shared: true },
  rounds: [
    { n: 1, state: 'SENT', openedAt: '2026-10-27T11:00:00.000Z', asked: [], replies: [], sentAt: null, since: [] },
    {
      n: 2,
      state: 'NOT_NEEDED',
      openedAt: '2026-10-28T09:00:00.000Z',
      asked: [],
      replies: [],
      since: [],
      notNeeded: 'ALREADY_ANSWERED',
      closedBy: 'GITRANKS',
    },
  ],
  since: [{ id: 'C_9', kind: 'COMMENT', author: 'sam-w', bot: false, excerpt: 'Thanks!', comments: 1, url: null }],
  checks: null,
  rules: null,
  lessonToAsk: false,
  outcome: null,
  waysOn: { lessonQuestions: '/learn/lessons/go-retries', lessonIssues: 'https://evil.example/x', course: '//evil' },
};

describe("the pull request page's read", () => {
  it('reads the page, rounds newest first, with who closed a round that is not needed', () => {
    const page = pullRequestPageOf(PAGE);
    expect(page).toMatchObject({ attemptId: 'A_1', made: 'LEARN', box: 'ROUND_WAITING', number: 57, round: 2 });
    expect(page?.rounds.map((round) => [round.n, round.state])).toEqual([
      [2, 'NOT_NEEDED'],
      [1, 'SENT'],
    ]);
    expect(page?.rounds[0].closedBy).toBe('GITRANKS');
    expect(page?.since?.map((ask) => ask.id)).toEqual(['C_9']);
  });

  it("keeps only this site's own paths among the ways on, and none for Contribute", () => {
    expect(pullRequestPageOf(PAGE)?.waysOn).toEqual({
      lessonQuestions: '/learn/lessons/go-retries',
      lessonIssues: null,
      course: null,
    });
    expect(pullRequestPageOf({ ...PAGE, made: 'CONTRIBUTE' })?.waysOn).toBeNull();
    expect(pullRequestPageOf({ ...PAGE, made: 'CONTRIBUTE' })?.walkthrough).toBeNull();
  });

  it('reads an older API without the newer fields as their plain defaults', () => {
    const { since, waysOn, autoSend, stoppedAtLimit, agent, ...older } = PAGE;
    const page = pullRequestPageOf(older);
    expect(page).toMatchObject({ since: [], waysOn: null, autoSend: false, stoppedAtLimit: false, agent: null });
  });

  it('is no page without what makes one, and keeps a box it does not know', () => {
    expect(pullRequestPageOf(null)).toBeNull();
    expect(pullRequestPageOf({ ...PAGE, attemptId: '' })).toBeNull();
    expect(pullRequestPageOf({ ...PAGE, repo: 'widgets' })).toBeNull();
    expect(pullRequestPageOf({ ...PAGE, stage: 'SOMEWHERE' })).toBeNull();
    expect(pullRequestPageOf({ ...PAGE, box: 'NEW_BOX' })?.box).toBe('NEW_BOX');
  });
});

describe("Approve's read", () => {
  const APPROVAL = {
    title: 'Skip empty names',
    description: 'Fixes #42',
    footer: '',
    titlePrefix: null,
    signOffNeeded: false,
    signOffOn: false,
    walkthroughPassed: true,
    lessonLater: null,
    change: { summary: null, files: 3, added: 1, removed: 1 },
    files: [{ path: 'a.go', added: 1, removed: 1 }, { path: '' }],
    filesTotal: 3,
  };

  it('counts GitHub as allowed unless the read says it is not, and the files as at least those listed', () => {
    expect(pullRequestApprovalOf(APPROVAL)).toMatchObject({ githubAllowed: true, filesTotal: 3 });
    expect(pullRequestApprovalOf(APPROVAL)?.files).toEqual([{ path: 'a.go', added: 1, removed: 1 }]);
    expect(pullRequestApprovalOf({ ...APPROVAL, githubAllowed: false })?.githubAllowed).toBe(false);
    expect(pullRequestApprovalOf({ ...APPROVAL, filesTotal: undefined })?.filesTotal).toBe(1);
  });

  it('is nothing without its title, description or change', () => {
    expect(pullRequestApprovalOf({ ...APPROVAL, title: undefined })).toBeNull();
    expect(pullRequestApprovalOf({ ...APPROVAL, change: null })).toBeNull();
  });
});

describe("the list's read", () => {
  const ROW = {
    attemptId: 'A_1',
    made: 'LEARN',
    repo: 'acme/widgets',
    issueNumber: 42,
    title: 'Empty names break the list',
    group: 'NEEDS_YOU',
    box: 'WALKTHROUGH',
    since: '2026-10-28T09:00:00.000Z',
  };

  it("keeps the row's page as the API gives it, the issue's when it does not say, none when it is not ours", () => {
    expect(pullRequestRowOf(ROW)).not.toHaveProperty('path');
    expect(pullRequestRowOf({ ...ROW, path: '/my/pull-requests/acme/widgets/42/earlier/A_0' })?.path).toBe(
      '/my/pull-requests/acme/widgets/42/earlier/A_0',
    );
    expect(pullRequestRowOf({ ...ROW, path: null })?.path).toBeNull();
    expect(pullRequestRowOf({ ...ROW, path: 'https://evil.example' })?.path).toBeNull();
  });

  it('marks a row stopped at the limit only when the read says so', () => {
    expect(pullRequestRowOf(ROW)).not.toHaveProperty('stoppedAtLimit');
    expect(pullRequestRowOf({ ...ROW, stoppedAtLimit: true })?.stoppedAtLimit).toBe(true);
  });

  it('drops a row it cannot read, and keeps the limit at least the open count', () => {
    const list = pullRequestListOf({ rows: [ROW, { ...ROW, group: 'ELSEWHERE' }], open: 9, limit: 8, more: 'c1' });
    expect(list?.rows).toHaveLength(1);
    expect(list).toMatchObject({ open: 9, limit: 9, atLimit: false, more: 'c1' });
    expect(pullRequestListOf({ rows: null })).toBeNull();
  });
});

describe("this site's paths", () => {
  it('takes a path of ours, never another site or a protocol-relative one', () => {
    expect(sitePathOf('/learn')).toBe('/learn');
    expect(sitePathOf('//evil.example')).toBeNull();
    expect(sitePathOf('/\\evil')).toBeNull();
    expect(sitePathOf('https://gitranks.com/learn')).toBeNull();
  });
});
