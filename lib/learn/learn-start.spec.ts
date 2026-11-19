import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startViewOf, startViews } from './__fixtures__/learn-start';
import { emptyProfile, filledProfile } from './__fixtures__/profile';
import {
  agentNameOf,
  fixAttemptPath,
  LEARN_START_POLL_MS,
  lastCallLabel,
  learnGoalLabelOf,
  learnStartConnectionOf,
  learnStartFixAttemptOf,
  learnStartFixOf,
  learnStartIssueOf,
  learnStartIssueUrlOf,
  learnStartLessonAttemptOf,
  learnStartNumberOf,
  learnStartPath,
  learnStartPromptOf,
  learnStartRefusalOf,
  learnStartRepoOf,
  learnStartStepsOpen,
  mcpClientOfName,
} from './learn-start';
import { type LearnStartTick, startLearnStartPoll } from './learn-start-poll';
import type { ContributeAttemptState, ContributeMcpToken } from '@/lib/workspace/contribute.types';

describe("the start page's address", () => {
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

  it('takes back what the page sends its actions, and writes the path the lists link', () => {
    expect(learnStartRepoOf('acme/router')).toBe('acme/router');
    expect(learnStartRepoOf('acme/router/x')).toBeNull();
    expect(learnStartRepoOf('acme')).toBeNull();
    expect(learnStartRepoOf(42)).toBeNull();
    expect(learnStartNumberOf(12)).toBe(12);
    expect(learnStartNumberOf(1.5)).toBeNull();
    expect(learnStartNumberOf('12')).toBeNull();
    expect(learnStartPath('driftwood-js/driftwood', 934)).toBe('/learn/start/driftwood-js/driftwood/934');
    expect(fixAttemptPath('A_9')).toBe('/contribute/attempts/A_9');
  });

  it('gives the agent one prompt: the issue and GitRanks Learn', () => {
    expect(learnStartPromptOf(learnStartIssueUrlOf(startViews.open))).toBe(
      'Fix https://github.com/driftwood-js/driftwood/issues/934 with GitRanks Learn and teach me',
    );
  });

  it("names the issue as GitHub's read spelled it, else as the address does", () => {
    const typed = startViewOf({ repo: 'Driftwood-JS/Driftwood' });
    expect(learnStartIssueUrlOf(typed)).toBe('https://github.com/driftwood-js/driftwood/issues/934');
    expect(learnStartIssueUrlOf({ ...typed, start: { ...typed.start, issue: null } })).toBe(
      'https://github.com/Driftwood-JS/Driftwood/issues/934',
    );
    const odd = startViewOf({ issue: { ...startViews.open.start.issue!, url: 'https://example.com/x' } });
    expect(learnStartIssueUrlOf(odd)).toBe('https://github.com/driftwood-js/driftwood/issues/934');
    const other = startViewOf({ issue: { ...startViews.open.start.issue!, number: 935 } });
    expect(learnStartIssueUrlOf(other)).toBe('https://github.com/driftwood-js/driftwood/issues/934');
  });
});

describe('what the lesson is written for', () => {
  it('words a language goal with its level, other goals by their value, and nothing without a goal', () => {
    expect(learnGoalLabelOf(filledProfile)).toBe('TypeScript, Some');
    expect(learnGoalLabelOf({ ...filledProfile, goalValue: 'Go' })).toBe('Go, New to it');
    expect(learnGoalLabelOf({ ...filledProfile, goalKind: 'PROJECT', goalValue: 'acme/router' })).toBe('acme/router');
    expect(learnGoalLabelOf(emptyProfile)).toBeNull();
    expect(learnGoalLabelOf({ ...filledProfile, goalValue: '  ' })).toBeNull();
    expect(learnGoalLabelOf(null)).toBeNull();
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

describe('step 3: a Fix attempt on the issue', () => {
  const words = (state: ContributeAttemptState) => learnStartFixOf(state);

  it('words what to do by its state, every case but the pull request ones asking to paste again or wait', () => {
    expect(words('QUEUED')).toEqual({ text: "Wait a moment: we're checking the claim.", pickAnother: false });
    expect(words('CLAIMING')).toEqual(words('QUEUED'));
    expect(words('RUNNING').text).toBe('Ask your agent to release it, then paste the prompt again.');
    expect(words('CHECKS').text).toBe('Wait for its checks, then discard it on its Contribute page.');
    expect(words('REVIEW').text).toBe('Discard it on its Contribute page, then paste the prompt again.');
    expect(words('PENDING_AUTOSUBMIT')).toEqual(words('REVIEW'));
    for (const state of ['SUBMITTING', 'PR_OPEN', 'FOLLOW_UP'] as const) {
      expect(words(state)).toEqual({
        text: "Your agent opened a regular pull request for this issue, so it can't be a lesson. Pick another issue.",
        pickAnother: true,
      });
    }
    expect(words('MERGED')).toEqual({ text: 'See where it is on its Contribute page.', pickAnother: false });
  });

  it('is the Fix attempt a YOURS answer names; a Learn attempt goes on to its page instead', () => {
    expect(learnStartFixAttemptOf(startViews.yoursFix)).toEqual({ id: 'A_9', mode: 'FIX', state: 'RUNNING' });
    expect(learnStartLessonAttemptOf(startViews.yoursFix)).toBeNull();
    expect(learnStartLessonAttemptOf(startViews.yoursLesson)?.id).toBe('A_7');
    expect(learnStartFixAttemptOf(startViews.yoursLesson)).toBeNull();
    expect(learnStartFixAttemptOf(startViews.open)).toBeNull();
  });
});

describe('refusals', () => {
  const words = (view = startViews.open) => learnStartRefusalOf(view);

  it('says nothing without one, or for YOURS, which goes on', () => {
    expect(words(startViews.open)).toBeNull();
    expect(words(startViews.yoursFix)).toBeNull();
    expect(learnStartStepsOpen(startViews.open)).toBe(true);
    expect(learnStartStepsOpen(startViews.yoursFix)).toBe(true);
  });

  it('hides steps 2 and 3 for every other code', () => {
    for (const view of [
      startViews.ownInProgress,
      startViews.paused,
      startViews.limitPrs,
      startViews.limitAttempts,
      startViews.daily,
      startViews.unavailable,
      startViews.taken,
      startViews.closed,
      startViews.repoUnavailable,
    ]) {
      expect(learnStartStepsOpen(view), view.start.refusal ?? '').toBe(false);
      expect(words(view), view.start.refusal ?? '').not.toBeNull();
    }
  });

  it('links the lesson in progress, or My lessons when it was not read', () => {
    expect(words(startViews.ownInProgress)).toEqual({
      kind: 'notice',
      text: 'Your lesson on “Keep trailing comments when formatting match arms” is in progress. One lesson of your own at a time: this one can start once that one is done.',
      action: { href: '/learn/attempts/A_3', label: 'Back to your lesson' },
    });
    const untitled = startViewOf(
      { refusal: 'OWN_IN_PROGRESS' },
      { current: { attemptId: 'A_3', repo: 'fern-lang/fern', issueNumber: 212, title: null } },
    );
    expect(words(untitled)).toMatchObject({ text: expect.stringContaining('Your lesson on “fern-lang/fern#212”') });
    const unnamed = startViewOf(
      { refusal: 'OWN_IN_PROGRESS' },
      { current: { attemptId: 'A_3', repo: null, issueNumber: 212, title: null } },
    );
    expect(words(unnamed)).toMatchObject({
      text: expect.stringContaining('Another lesson of yours is in progress.'),
      action: { href: '/learn/attempts/A_3', label: 'Back to your lesson' },
    });
    expect(words(startViewOf({ refusal: 'OWN_IN_PROGRESS' }))).toMatchObject({
      text: expect.stringContaining('Another lesson of yours is in progress.'),
      action: { href: '/learn/lessons', label: 'My lessons' },
    });
  });

  it('words LIMIT_REACHED by the limit it hit', () => {
    // The open pull request limit is said by `LimitNotice`, in its one wording.
    expect(words(startViews.limitPrs)).toEqual({ kind: 'limit', count: 2 });
    expect(words(startViewOf({ refusal: 'LIMIT_REACHED', limit: 'open_prs_at_a_time' }))).toEqual({
      kind: 'limit',
      count: 0,
    });
    expect(words(startViews.limitAttempts)).toEqual({
      kind: 'notice',
      text: 'Your agent is working on another issue. A new lesson can start when that one is done.',
      action: { href: '/my/pull-requests', label: 'Pull requests' },
    });
  });

  it("uses Contribute's paused notice, and sends the rest back to the issues", () => {
    expect(words(startViews.paused)).toEqual({ kind: 'paused' });
    expect(words(startViews.daily)).toEqual({
      kind: 'notice',
      text: "You've taken today's claims. Try again tomorrow.",
      action: null,
    });
    const back = { href: '/learn#issues', label: 'Back to the issues' };
    expect(words(startViews.unavailable)).toEqual({
      kind: 'notice',
      text: "This issue can't be started here.",
      action: back,
    });
    expect(words(startViews.taken)).toEqual({
      kind: 'notice',
      text: "Someone else's agent took this issue.",
      action: back,
    });
    expect(words(startViews.closed)).toEqual({
      kind: 'notice',
      text: 'This issue was closed meanwhile.',
      action: back,
    });
    expect(words(startViews.repoUnavailable)).toEqual({
      kind: 'notice',
      text: "This project can't take a pull request from us right now.",
      action: back,
    });
  });
});

describe("step 3's poll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const pageOf = (visibilityState: DocumentVisibilityState = 'visible') => {
    const document = Object.assign(new EventTarget(), { visibilityState });
    return {
      env: { document } as unknown as Parameters<typeof startLearnStartPoll>[2],
      show: () => {
        document.visibilityState = 'visible';
        document.dispatchEvent(new Event('visibilitychange'));
      },
      hide: () => {
        document.visibilityState = 'hidden';
        document.dispatchEvent(new Event('visibilitychange'));
      },
    };
  };
  const going = () => vi.fn(async (): Promise<LearnStartTick> => 'go');

  it('asks at once, then every 5 seconds while the page is shown', async () => {
    const ask = going();
    const poll = startLearnStartPoll(ask, vi.fn(), pageOf().env);
    await vi.advanceTimersByTimeAsync(0);
    expect(ask).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS - 1);
    expect(ask).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(ask).toHaveBeenCalledTimes(2);
    poll.stop();
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS * 4);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('asks nothing while hidden, and at once when shown again', async () => {
    const ask = going();
    const page = pageOf('hidden');
    const poll = startLearnStartPoll(ask, vi.fn(), page.env);
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS * 10);
    expect(ask).not.toHaveBeenCalled();
    page.show();
    await vi.advanceTimersByTimeAsync(0);
    expect(ask).toHaveBeenCalledTimes(1);
    page.hide();
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS * 10);
    expect(ask).toHaveBeenCalledTimes(1);
    poll.stop();
  });

  it('stops once an answer says so', async () => {
    const ask = vi.fn(async (): Promise<LearnStartTick> => 'stop');
    const onTimeout = vi.fn();
    startLearnStartPoll(ask, onTimeout, pageOf().env);
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS * 10);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('never asks twice at a time, and goes on after a failed ask', async () => {
    let answer: (tick: LearnStartTick) => void = () => {};
    const ask = vi
      .fn<() => Promise<LearnStartTick>>()
      .mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('go');
    const poll = startLearnStartPoll(ask, vi.fn(), pageOf().env);
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS * 3);
    expect(ask).toHaveBeenCalledTimes(1);
    answer('go');
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS);
    expect(ask).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS);
    expect(ask).toHaveBeenCalledTimes(3);
    poll.stop();
  });

  it('times out once after 30 minutes of the page shown, hidden time not counting', async () => {
    const ask = going();
    const onTimeout = vi.fn();
    const page = pageOf();
    startLearnStartPoll(ask, onTimeout, page.env);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    page.hide();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    page.show();
    await vi.advanceTimersByTimeAsync(20 * 60_000 - LEARN_START_POLL_MS);
    expect(onTimeout).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    const asked = ask.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    page.hide();
    page.show();
    await vi.advanceTimersByTimeAsync(0);
    expect(ask).toHaveBeenCalledTimes(asked);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('counts the 30 minutes in time, not asks: slow answers do not stretch them', async () => {
    const ask = vi.fn(() => new Promise<LearnStartTick>((resolve) => setTimeout(() => resolve('go'), 7_000)));
    const onTimeout = vi.fn();
    startLearnStartPoll(ask, onTimeout, pageOf().env);
    await vi.advanceTimersByTimeAsync(30 * 60_000 + LEARN_START_POLL_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls.length).toBeLessThan(360);
  });

  it('ends the wait as its 30 minutes would when an ask gives up', async () => {
    const ask = vi.fn(async (): Promise<LearnStartTick> => 'give-up');
    const onTimeout = vi.fn();
    startLearnStartPoll(ask, onTimeout, pageOf().env);
    await vi.advanceTimersByTimeAsync(LEARN_START_POLL_MS * 4);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
