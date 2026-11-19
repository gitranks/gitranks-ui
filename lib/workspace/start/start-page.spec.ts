import { describe, expect, it } from 'vitest';

import { fixAttemptOf, lessonAttempt, startViewOf, startViews } from './__fixtures__/start-page';
import { startPromptOf } from './prompt';
import {
  agentNameOf,
  lastCallLabel,
  learnStartConnectionOf,
  learnStartFixOf,
  learnStartIssueOf,
  learnStartNumberOf,
  learnStartRepoOf,
  mcpClientOfName,
  restartHintOf,
  startBackOf,
  startClaimOf,
  startIssueUrlOf,
  startModeOf,
  startPullRequestPathOf,
  startStepsOpen,
  startYoursOf,
} from './start-page';
import type { ContributeAttemptState, ContributeMcpToken } from '@/lib/workspace/contribute.types';
import { learnStartPath, startPath } from '@/lib/workspace/paths';

describe("the Start page's address", () => {
  it('names an issue by owner, repository and number, and nothing else', () => {
    expect(learnStartIssueOf('driftwood-js', 'driftwood', '934')).toEqual({
      repo: 'driftwood-js/driftwood',
      number: 934,
    });
    expect(learnStartIssueOf('acme', 'router.js', '1')).toEqual({ repo: 'acme/router.js', number: 1 });
    for (const [owner, name, number] of [
      ['acme', 'router', '0'],
      ['acme', 'router', '012'],
      ['acme', 'router', '1e3'],
      ['acme', 'router', '99999999999'],
      ['acme', '..', '1'],
      ['acme', 'a/b', '1'],
      ['-acme', 'router', '1'],
      ['ac.me', 'router', '1'],
      ['', 'router', '1'],
    ]) {
      expect(learnStartIssueOf(owner, name, number), `${owner}/${name}#${number}`).toBeNull();
    }
    expect(learnStartIssueOf(undefined, 'router', '1')).toBeNull();
  });

  it('takes back what the page sends its actions, and writes the paths the lists link', () => {
    expect(learnStartRepoOf('acme/router')).toBe('acme/router');
    expect(learnStartRepoOf('acme/router/x')).toBeNull();
    expect(learnStartRepoOf('acme')).toBeNull();
    expect(learnStartRepoOf(42)).toBeNull();
    expect(learnStartNumberOf(12)).toBe(12);
    expect(learnStartNumberOf(1.5)).toBeNull();
    expect(learnStartNumberOf('12')).toBeNull();
    expect(learnStartPath('driftwood-js/driftwood', 934)).toBe('/learn/start/driftwood-js/driftwood/934');
    const ref = { repo: 'driftwood-js/driftwood', issue: 934 };
    expect(startPath(ref)).toBe('/my/start/driftwood-js/driftwood/934');
    expect(startPath(ref, { lesson: true })).toBe('/my/start/driftwood-js/driftwood/934?lesson=1');
    expect(startPath(ref, { lesson: true, from: 'contribute' })).toBe(
      '/my/start/driftwood-js/driftwood/934?lesson=1&from=contribute',
    );
    expect(startPath({ repo: 'a b/c', issue: 1 })).toBe('/my/start/a%20b/c/1');
  });

  it('is in lesson mode for ?lesson=1 alone, and leads back to the issues the mode came from', () => {
    expect(startModeOf('1')).toBe('lesson');
    for (const other of [undefined, '', '0', 'true', ['1']]) expect(startModeOf(other)).toBe('fix');
    expect(startBackOf('fix')).toEqual({ href: '/contribute/issues', label: 'Issues for you' });
    expect(startBackOf('fix', 'contribute')).toEqual(startBackOf('fix'));
    expect(startBackOf('lesson')).toEqual({ href: '/learn#issues', label: 'Back to the issues' });
    expect(startBackOf('lesson', 'contribute')).toEqual({ href: '/contribute/issues', label: 'Back to the issues' });
  });
});

describe('step 2: one prompt per mode', () => {
  it('gives the agent the issue and "with GitRanks", and asks for a lesson in lesson mode', () => {
    const url = startIssueUrlOf(startViews.open);
    expect(startPromptOf(url, 'fix')).toBe('Fix https://github.com/driftwood-js/driftwood/issues/934 with GitRanks');
    expect(startPromptOf(url, 'lesson')).toBe(
      'Fix https://github.com/driftwood-js/driftwood/issues/934 with GitRanks Learn and teach me',
    );
  });

  it("names the issue as GitHub's read spells it, else as the address does", () => {
    const typed = startViewOf({
      issue: { ...startViews.open.start.issue!, url: 'https://github.com/Driftwood-JS/Driftwood/issues/934' },
    });
    expect(startIssueUrlOf(typed)).toBe('https://github.com/Driftwood-JS/Driftwood/issues/934');
    expect(startIssueUrlOf(startViews.untitled)).toBe('https://github.com/driftwood-js/driftwood/issues/934');
    const odd = startViewOf({ issue: { ...startViews.open.start.issue!, url: 'javascript:alert(1)' } });
    expect(startIssueUrlOf(odd)).toBe('https://github.com/driftwood-js/driftwood/issues/934');
    const other = startViewOf({
      issue: { ...startViews.open.start.issue!, number: 1, url: 'https://github.com/driftwood-js/driftwood/issues/1' },
    });
    expect(startIssueUrlOf(other)).toBe('https://github.com/driftwood-js/driftwood/issues/934');
  });

  it('says to restart an agent used in the last 30 days whose tool list was seen without Learn, and nothing else', () => {
    const now = new Date('2026-10-28T12:00:00.000Z');
    const used = (lastUsedAt: string | null, learnListed?: boolean | null) => ({ lastUsedAt, learnListed });
    expect(restartHintOf([used('2026-10-27T00:00:00.000Z', false)], now)).toBe(true);
    expect(restartHintOf([used('2026-10-27T00:00:00.000Z', true), used('2026-10-01T00:00:00.000Z', false)], now)).toBe(
      true,
    );
    // Older than 30 days, never used, listed, or an API without the field.
    expect(restartHintOf([used('2026-09-20T00:00:00.000Z', false)], now)).toBe(false);
    expect(restartHintOf([used(null, false)], now)).toBe(false);
    expect(restartHintOf([used('2026-10-27T00:00:00.000Z', true)], now)).toBe(false);
    expect(restartHintOf([used('2026-10-27T00:00:00.000Z')], now)).toBe(false);
    expect(restartHintOf(null, now)).toBe(false);
  });
});

describe('step 1: connected means the agent has called', () => {
  const token = (patch: Partial<ContributeMcpToken>): ContributeMcpToken => ({
    id: 'T_1',
    kind: 'PERSONAL',
    name: 'Claude Code on macOS',
    last4: 'Qx9z',
    createdAt: '2026-10-28T10:00:00.000Z',
    lastUsedAt: null,
    ...patch,
  });

  it('does not count a token made and never used', () => {
    expect(learnStartConnectionOf([token({})])).toBeNull();
    expect(learnStartConnectionOf([])).toBeNull();
    expect(learnStartConnectionOf(undefined)).toBeNull();
  });

  it('counts a used token and an agent that signed in, naming the one used last', () => {
    expect(learnStartConnectionOf([token({ lastUsedAt: '2026-10-28T11:00:00.000Z' })])).toEqual({
      client: 'claude-code',
      lastCallAt: '2026-10-28T11:00:00.000Z',
    });
    const signedIn = token({ id: 'T_2', kind: 'OAUTH', name: 'Codex', last4: null, lastUsedAt: null });
    expect(learnStartConnectionOf([token({}), signedIn])).toEqual({ client: 'codex', lastCallAt: null });
    expect(
      learnStartConnectionOf([
        token({ lastUsedAt: '2026-10-28T09:00:00.000Z' }),
        token({ id: 'T_3', name: 'laptop', lastUsedAt: '2026-10-28T11:30:00.000Z' }),
      ]),
    ).toEqual({ client: null, lastCallAt: '2026-10-28T11:30:00.000Z' });
  });

  it('names the agent from its connection, else "your agent"', () => {
    expect(mcpClientOfName('Gemini CLI on Linux')).toBe('gemini-cli');
    expect(mcpClientOfName('gemini')).toBe('gemini-cli');
    expect(mcpClientOfName('Antigravity on Windows')).toBe('antigravity');
    expect(mcpClientOfName('Cursor')).toBe('cursor');
    expect(mcpClientOfName('Claude Desktop')).toBeNull();
    expect(mcpClientOfName('')).toBeNull();
    expect(agentNameOf('codex')).toBe('Codex CLI');
    expect(agentNameOf(null)).toBe('your agent');
  });

  it('says a call within the minute is a moment ago', () => {
    const now = new Date('2026-10-28T12:00:00.000Z');
    expect(lastCallLabel('2026-10-28T11:59:30.000Z', now)).toBe('a moment ago');
    expect(lastCallLabel('2026-10-28T12:00:05.000Z', now)).toBe('a moment ago');
    expect(lastCallLabel('2026-10-28T11:57:00.000Z', now)).toBe('3 minutes ago');
  });
});

describe("step 3: the viewer's attempt on the issue", () => {
  const words = (state: ContributeAttemptState) => learnStartFixOf(state);

  it("opens the pull request's page for any attempt in Fix mode, and for a lesson in lesson mode", () => {
    expect(startClaimOf(fixAttemptOf(), 'fix')).toEqual({ kind: 'open', attempt: fixAttemptOf() });
    expect(startClaimOf(lessonAttempt, 'fix')).toEqual({ kind: 'open', attempt: lessonAttempt });
    expect(startClaimOf(lessonAttempt, 'lesson')).toEqual({ kind: 'open', attempt: lessonAttempt });
    expect(startClaimOf(fixAttemptOf(), 'lesson')).toEqual({ kind: 'fix', attempt: fixAttemptOf() });
    expect(startClaimOf(null, 'fix')).toBeNull();
  });

  it('is the attempt a YOURS answer names, and nothing for any other answer', () => {
    expect(startYoursOf(startViews.yoursFix, 'lesson')).toEqual({ kind: 'fix', attempt: fixAttemptOf('RUNNING') });
    expect(startYoursOf(startViews.yoursLesson, 'lesson')?.kind).toBe('open');
    expect(startYoursOf(startViews.open, 'fix')).toBeNull();
    expect(startYoursOf(startViews.taken, 'fix')).toBeNull();
    expect(startStepsOpen(startViews.open)).toBe(true);
    expect(startStepsOpen(startViews.yoursFix)).toBe(true);
    expect(startStepsOpen(startViews.taken)).toBe(false);
  });

  it("opens the pull request's page by repo and issue, the repo as GitHub's read spells it", () => {
    const ref = { repo: 'driftwood-js/driftwood', issue: 934 };
    expect(startPullRequestPathOf(ref, startViews.open)).toBe('/my/pull-requests/driftwood-js/driftwood/934');
    const typed = startViewOf({ issue: { ...startViews.open.start.issue!, repo: 'Driftwood-JS/Driftwood' } });
    expect(startPullRequestPathOf(ref, typed)).toBe('/my/pull-requests/Driftwood-JS/Driftwood/934');
    expect(startPullRequestPathOf(ref, startViews.untitled)).toBe('/my/pull-requests/driftwood-js/driftwood/934');
    expect(startPullRequestPathOf(ref, null)).toBe('/my/pull-requests/driftwood-js/driftwood/934');
  });

  it('words a Fix attempt in lesson mode by its state: wait, release, discard, or pick another', () => {
    expect(words('QUEUED')).toEqual({ text: "Wait a moment: we're checking the claim.", pickAnother: false });
    expect(words('CLAIMING')).toEqual(words('QUEUED'));
    expect(words('RUNNING').text).toBe('Ask your agent to release it, then paste the prompt again.');
    expect(words('CHECKS').text).toBe('Wait for its checks, then discard it on its page.');
    expect(words('REVIEW').text).toBe('Discard it on its page, then paste the prompt again.');
    expect(words('PENDING_AUTOSUBMIT')).toEqual(words('REVIEW'));
    for (const state of ['SUBMITTING', 'PR_OPEN', 'FOLLOW_UP'] as const) {
      expect(words(state)).toEqual({
        text: "Your agent opened a regular pull request for this issue, so it can't be a lesson. Pick another issue.",
        pickAnother: true,
      });
    }
    expect(words('MERGED')).toEqual({ text: 'See where it is on its page.', pickAnother: false });
  });
});
