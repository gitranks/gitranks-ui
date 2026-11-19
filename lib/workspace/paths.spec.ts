import { describe, expect, it } from 'vitest';

import {
  CONNECT_AGENT_PATH,
  learnAttemptPath,
  pullRequestByAttemptPath,
  RUNS_PATH,
  SETTINGS_PATHS,
  WORKSPACE_PATHS,
} from './paths';

describe('the workspace addresses', () => {
  it("are today's pages", () => {
    expect(WORKSPACE_PATHS).toEqual({
      contribute: '/contribute',
      learn: '/learn',
      pullRequests: '/contribute/me',
      agent: '/contribute/settings/own-agent',
      agentConnect: '/contribute/connect?path=agent',
      agentKey: '/contribute/settings/keys',
      agentModel: '/contribute/settings/agent',
      agentBudget: '/contribute/settings/budget',
      agentRuns: '/contribute/runs',
      settings: '/contribute/settings',
      settingsWork: '/contribute/settings/work',
      settingsGoal: '/learn/profile',
      progress: '/learn/lessons',
    });
  });

  it('are the ones the older names give', () => {
    expect(SETTINGS_PATHS).toEqual({
      summary: '/contribute/settings',
      work: '/contribute/settings/work',
      budget: '/contribute/settings/budget',
      agent: '/contribute/settings/agent',
      keys: '/contribute/settings/keys',
      ownAgent: '/contribute/settings/own-agent',
    });
    expect(RUNS_PATH).toBe('/contribute/runs');
    expect(CONNECT_AGENT_PATH).toBe('/contribute/connect?path=agent');
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
