import { describe, expect, it } from 'vitest';

import {
  GITHUB_ACCESS_PATH,
  isByAttemptPath,
  isInsidePath,
  isMyPath,
  isTablessPath,
  isWorkspacePath,
  KEY_REPLACE_PATH,
  movedAnchorOf,
  PICK_ISSUE_PATHS,
  pullRequestByAttemptPath,
  pullRequestPath,
  pullRequestsPath,
  SETTINGS_PATHS,
  settingsPathOf,
  settingUpHomeOf,
  switchPathOf,
  WORKSPACE_ANCHORS,
  WORKSPACE_PATHS,
} from './paths';

describe('the workspace addresses', () => {
  it('are under /my, but for the two front tabs and the Learn pages that keep theirs until their own are built', () => {
    expect(WORKSPACE_PATHS).toEqual({
      contribute: '/contribute',
      learn: '/learn',
      pullRequests: '/my/pull-requests',
      agent: '/my/agent',
      agentConnect: '/my/agent/connect',
      agentKey: '/my/agent/key',
      agentModel: '/my/agent/model',
      agentBudget: '/my/agent/budget',
      agentRuns: '/my/agent/runs',
      settings: '/my/settings',
      settingsGithub: '/my/settings/github',
      settingsPullRequests: '/my/settings/pull-requests',
      settingsWork: '/my/settings/work',
      settingsGoal: '/my/settings/goal',
      progress: '/my/progress',
    });
  });

  it('are the ones the older names give', () => {
    expect(SETTINGS_PATHS).toEqual({
      summary: '/my/settings',
      github: '/my/settings/github',
      pullRequests: '/my/settings/pull-requests',
      goal: '/my/settings/goal',
      work: '/my/settings/work',
      budget: '/my/agent/budget',
      agent: '/my/agent/model',
      keys: '/my/agent/key',
      ownAgent: '/my/agent',
    });
    expect(WORKSPACE_PATHS.agentRuns).toBe('/my/agent/runs');
    expect(WORKSPACE_PATHS.agentConnect).toBe('/my/agent/connect');
    expect(WORKSPACE_PATHS.agentKey).toBe('/my/agent/key');
    expect(switchPathOf('STACK')).toBe('/my/settings/work/switch/stack');
  });

  it('name the rows other pages link to where they are', () => {
    expect(WORKSPACE_ANCHORS).toEqual({
      limitRow: '/my/settings/pull-requests#open',
      attemptsRow: '/my/settings/pull-requests#attempts',
      work: '/my/settings/work#work',
      forLearning: '/my/settings/goal',
      agentKey: '/my/agent/key',
      agentBudget: '/my/agent/budget',
    });
    expect(GITHUB_ACCESS_PATH).toBe('/my/settings/github');
    expect(KEY_REPLACE_PATH).toBe('/my/agent/key?replace=1');
  });

  it("send an old Settings anchor to the page it is on now; the summary's own stay", () => {
    expect(movedAnchorOf('limits')).toBe('/my/agent/budget');
    expect(movedAnchorOf('pacing')).toBe('/my/agent/budget#pacing');
    expect(movedAnchorOf('more-limits')).toBe('/my/agent/budget#more-limits');
    expect(movedAnchorOf('agent')).toBe('/my/agent/model');
    expect(movedAnchorOf('prs')).toBe('/my/settings/pull-requests');
    expect(movedAnchorOf('github')).toBe('/my/settings/github');
    expect(movedAnchorOf('access')).toBe('/my/agent/key');
    expect(movedAnchorOf('own-agent')).toBe('/my/agent#own-agent');
    expect(movedAnchorOf('pause')).toBe('/my/agent#hosted-level');
    expect(movedAnchorOf('autopilot')).toBe('/my/agent#autopilot');
    for (const anchor of ['modes', 'work', 'ignored', 'rules']) {
      expect(movedAnchorOf(anchor)).toBe(`/my/settings/work#${anchor}`);
    }
    for (const anchor of ['email', 'danger', 'toString']) expect(movedAnchorOf(anchor)).toBeNull();
    expect(settingsPathOf('work')).toBe('/my/settings/work#work');
    expect(settingsPathOf('email')).toBe('/my/settings#email');
  });
});

describe('which pages are which', () => {
  it('takes /my and everything under it as the workspace, in the spellings the router reads', () => {
    for (const path of ['/my', '/my/', '/MY/settings', '//my//agent', '/%6Dy/pull-requests', '/my%']) {
      expect(isMyPath(path), path).toBe(true);
    }
    for (const path of ['/', '/myself', '/mystery/x', '/profile/my', '/contribute/my']) {
      expect(isMyPath(path), path).toBe(false);
    }
  });

  it('is inside for Contribute and /my, not for Learn; the workspace for all three', () => {
    for (const path of ['/contribute', '/contribute/issues', '/my/agent']) expect(isInsidePath(path), path).toBe(true);
    for (const path of ['/learn', '/learn/start/a/b/1', '/', '/profile/x']) {
      expect(isInsidePath(path), path).toBe(false);
    }
    for (const path of ['/contribute', '/learn', '/learn/lessons', '/my/settings']) {
      expect(isWorkspacePath(path), path).toBe(true);
    }
    for (const path of ['/', '/learning', '/profile/x']) expect(isWorkspacePath(path), path).toBe(false);
  });

  it('shows no tabs on the pages about Contribute and Learn', () => {
    for (const path of [
      '/contribute/maintainers',
      '/contribute/maintainers/report',
      '/contribute/ledger',
      '/contribute/mcp',
      '/contribute/faq',
      '/contribute/authorize',
      '/learn/about',
      '/learn/maintainers',
      '/learn/lessons/a-lesson-1x',
      '/learn/lessons/a-lesson-1x/passes/octocat',
    ]) {
      expect(isTablessPath(path), path).toBe(true);
    }
    for (const path of ['/contribute', '/contribute/issues', '/learn', '/learn/lessons', '/my/settings/goal', '/my']) {
      expect(isTablessPath(path), path).toBe(false);
    }
  });

  it("sends an account being set up to Contribute's home, carrying the connect step it was on", () => {
    const at = (path: string) => settingUpHomeOf(new URL(path, 'https://gitranks.com'));
    expect(at('/my/agent/connect')).toBe('/contribute?start=agent');
    expect(at('/my/agent/connect/?proof=A_1')).toBe('/contribute?start=agent');
    expect(at('/my/agent/key')).toBe('/contribute?start=key');
    for (const path of ['/my/agent', '/my/settings', '/my/pull-requests', '/contribute/issues']) {
      expect(at(path), path).toBe('/contribute');
    }
  });
});

describe("one attempt's page, by its id", () => {
  it('is the address by attempt, which finds the attempt and goes on to its page', () => {
    expect(pullRequestByAttemptPath('A_1')).toBe('/my/pull-requests/by-attempt/A_1');
    expect(pullRequestByAttemptPath('a/b')).toBe('/my/pull-requests/by-attempt/a%2Fb');
  });

  it("asks for a Learn attempt's lesson with view=lesson", () => {
    expect(pullRequestByAttemptPath('A_1', { view: 'lesson' })).toBe('/my/pull-requests/by-attempt/A_1?view=lesson');
  });

  it('keeps the query it is given', () => {
    expect(pullRequestByAttemptPath('A_1', { query: { session: 'next' } })).toBe(
      '/my/pull-requests/by-attempt/A_1?session=next',
    );
    expect(pullRequestByAttemptPath('A_1', { query: { resume: 'n 1', move: 'x' } })).toBe(
      '/my/pull-requests/by-attempt/A_1?resume=n+1&move=x',
    );
    expect(pullRequestByAttemptPath('A_1', { query: {} })).toBe('/my/pull-requests/by-attempt/A_1');
  });
});

describe("the pull request's page, by repo and issue", () => {
  it('names the issue, an earlier attempt on it, a run and the next step', () => {
    const ref = { repo: 'acme/widgets', issue: 42 };
    expect(pullRequestPath(ref)).toBe('/my/pull-requests/acme/widgets/42');
    expect(pullRequestPath(ref, 'next')).toBe('/my/pull-requests/acme/widgets/42?session=next');
    expect(pullRequestPath(ref, { run: 'A_F2' })).toBe('/my/pull-requests/acme/widgets/42/runs/A_F2');
    expect(pullRequestPath({ ...ref, earlier: 'A_0' })).toBe('/my/pull-requests/acme/widgets/42/earlier/A_0');
    expect(pullRequestPath({ ...ref, earlier: 'A_0' }, { run: 'A_F1' })).toBe(
      '/my/pull-requests/acme/widgets/42/earlier/A_0/runs/A_F1',
    );
    expect(pullRequestPath({ ...ref, earlier: null }, 'next')).toBe('/my/pull-requests/acme/widgets/42?session=next');
    // GitHub's names need no escaping, but nothing else reaches the path unescaped.
    expect(pullRequestPath({ repo: 'a.b/c_d-e', issue: 1 }, { run: 'x/y' })).toBe(
      '/my/pull-requests/a.b/c_d-e/1/runs/x%2Fy',
    );
  });

  it('knows the address by attempt in any spelling, and nothing under it', () => {
    for (const path of [
      '/my/pull-requests/by-attempt/A_1',
      '/my/pull-requests/by-attempt/A_1/',
      '/MY//Pull-Requests/By-Attempt/A_1',
    ]) {
      expect(isByAttemptPath(path), path).toBe(true);
    }
    for (const path of [
      '/my/pull-requests/by-attempt',
      '/my/pull-requests/by-attempt/A_1/x',
      '/my/pull-requests/acme/w/1',
      // A malformed id names no attempt: the route answers its 404 to anyone.
      '/my/pull-requests/by-attempt/a.b',
      `/my/pull-requests/by-attempt/${'x'.repeat(65)}`,
    ]) {
      expect(isByAttemptPath(path), path).toBe(false);
    }
  });

  it("picks another issue on the attempt's side", () => {
    expect(PICK_ISSUE_PATHS).toEqual({ fix: '/contribute#issues', learn: '/learn#issues' });
  });
});

describe('the Pull requests tab under its filters', () => {
  it('says only what differs from the first page of everything', () => {
    expect(pullRequestsPath()).toBe('/my/pull-requests');
    expect(pullRequestsPath({ page: 1 })).toBe('/my/pull-requests');
    expect(pullRequestsPath({ state: 'open' })).toBe('/my/pull-requests?state=open');
    expect(pullRequestsPath({ made: 'learn', page: 3 })).toBe('/my/pull-requests?made=learn&page=3');
    expect(pullRequestsPath({ state: 'merged', made: 'contribute', page: 2 })).toBe(
      '/my/pull-requests?state=merged&made=contribute&page=2',
    );
  });
});
