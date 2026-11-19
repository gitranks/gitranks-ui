import { describe, expect, it } from 'vitest';

import {
  CONNECT_AGENT_PATH,
  CONNECT_KEY_PATH,
  GITHUB_ACCESS_PATH,
  isInsidePath,
  isMyPath,
  isTablessPath,
  isWorkspacePath,
  KEY_REPLACE_PATH,
  learnAttemptPath,
  movedAnchorOf,
  pullRequestByAttemptPath,
  RUNS_PATH,
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
      settingsWork: '/my/settings/work',
      settingsGoal: '/learn/profile',
      progress: '/learn/lessons',
    });
  });

  it('are the ones the older names give', () => {
    expect(SETTINGS_PATHS).toEqual({
      summary: '/my/settings',
      work: '/my/settings/work',
      budget: '/my/agent/budget',
      agent: '/my/agent/model',
      keys: '/my/agent/key',
      ownAgent: '/my/agent',
    });
    expect(RUNS_PATH).toBe('/my/agent/runs');
    expect(CONNECT_AGENT_PATH).toBe('/my/agent/connect');
    expect(CONNECT_KEY_PATH).toBe('/my/agent/key');
    expect(switchPathOf('STACK')).toBe('/my/settings/work/switch/stack');
  });

  it('name the rows other pages link to where they are until Settings is laid out', () => {
    expect(WORKSPACE_ANCHORS).toEqual({
      limitRow: '/my/agent/model#prs',
      attemptsRow: '/my/agent/budget#more-limits',
      work: '/my/settings#work',
      forLearning: '/learn/profile',
      agentKey: '/my/agent/key',
      agentBudget: '/my/agent/budget',
    });
    expect(GITHUB_ACCESS_PATH).toBe('/my/agent/key#github');
    expect(KEY_REPLACE_PATH).toBe('/my/agent/key?replace=1');
  });

  it("send an old Settings anchor to the page it is on now; the summary's own stay", () => {
    expect(movedAnchorOf('limits')).toBe('/my/agent/budget');
    expect(movedAnchorOf('pacing')).toBe('/my/agent/budget#pacing');
    expect(movedAnchorOf('more-limits')).toBe('/my/agent/budget#more-limits');
    expect(movedAnchorOf('agent')).toBe('/my/agent/model');
    expect(movedAnchorOf('prs')).toBe('/my/agent/model#prs');
    expect(movedAnchorOf('access')).toBe('/my/agent/key');
    expect(movedAnchorOf('own-agent')).toBe('/my/agent');
    for (const anchor of ['modes', 'work', 'ignored', 'email', 'toString']) expect(movedAnchorOf(anchor)).toBeNull();
    expect(settingsPathOf('work')).toBe('/my/settings#work');
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
    for (const path of ['/contribute', '/contribute/issues', '/learn', '/learn/lessons', '/learn/profile', '/my']) {
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
  it("is Contribute's attempt page, which sends a Learn attempt on to its lesson", () => {
    expect(pullRequestByAttemptPath('A_1')).toBe('/contribute/attempts/A_1');
    expect(pullRequestByAttemptPath('a/b')).toBe('/contribute/attempts/a%2Fb');
  });

  it("is the lesson's page when the lesson is asked for", () => {
    expect(pullRequestByAttemptPath('A_1', { view: 'lesson' })).toBe('/learn/attempts/A_1');
    expect(pullRequestByAttemptPath('A_1', { view: 'lesson' })).toBe(learnAttemptPath('A_1'));
  });

  it('keeps the query it is given', () => {
    expect(pullRequestByAttemptPath('A_1', { query: { session: 'next' } })).toBe(
      '/contribute/attempts/A_1?session=next',
    );
    expect(pullRequestByAttemptPath('A_1', { query: { resume: 'n 1', move: 'x' } })).toBe(
      '/contribute/attempts/A_1?resume=n+1&move=x',
    );
    expect(pullRequestByAttemptPath('A_1', { query: {} })).toBe('/contribute/attempts/A_1');
  });
});
