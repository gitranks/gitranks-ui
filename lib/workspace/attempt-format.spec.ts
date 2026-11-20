import { describe, expect, it } from 'vitest';

import {
  editableBodyOf,
  endMoveOf,
  endReasonLabelOf,
  eventLabelOf,
  followUpPromptOf,
  footerPreviewOf,
  ownAgentChangesOf,
} from './attempt-format';
import type { ContributeAttemptEndReason } from './contribute.types';

const FOOTER =
  '<sub>Made with [GitRanks Contribute](https://gitranks.com) and Codex (GPT) · Reviewed and submitted by @octocat</sub>';
const SENTENCE = 'This PR was written in part with the assistance of generative AI.';

describe('editableBodyOf', () => {
  it('takes out our footer, the old wording and the new, whatever page it links', () => {
    expect(editableBodyOf(`Done.\n\n${FOOTER}`)).toBe('Done.');
    expect(
      editableBodyOf('Done.\n\n🤖 Made with Claude via [gitranks.com](https://gitranks.com) · reviewed by @x'),
    ).toBe('Done.');
    expect(
      editableBodyOf(
        'Done.\n\n<sub>Made with [GitRanks Contribute](https://gitranks.com/maintainers) and Cursor</sub>',
      ),
    ).toBe('Done.');
    const first =
      '<sub>Made with [GitRanks Contribute](https://gitranks.com/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0) powered by Claude (Opus) · Reviewed and submitted by @mira-dev</sub>';
    const second =
      '<sub>Something off? [Tell us or opt out in one step](https://gitranks.com/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0) — maintainers are always in control</sub>';
    // Both lines, joined with <br> as the API writes them, on lines of their own, or the second alone.
    expect(editableBodyOf(`Done.\n\n${first}<br>\n${second}`)).toBe('Done.');
    expect(editableBodyOf(`Done.\n\n${first}<br>${second}`)).toBe('Done.');
    expect(editableBodyOf(`Done.\r\n\r\n${first}<br>\r\n${second}\r\n`)).toBe('Done.');
    expect(editableBodyOf(`Done.\n\n${second}`)).toBe('Done.');
    expect(editableBodyOf('Something off? Tell us here, by hand.')).toBe('Something off? Tell us here, by hand.');
    expect(editableBodyOf('Made with GitRanks Contribute, then edited by hand.')).toBe(
      'Made with GitRanks Contribute, then edited by hand.',
    );
    expect(editableBodyOf('Made with GitRanks Learn, then edited by hand.')).toBe(
      'Made with GitRanks Learn, then edited by hand.',
    );
  });

  it("takes out today's footer: both lines in one <sub>, on one line", () => {
    const say =
      'Something off? [Tell us or opt out in one step](https://gitranks.com/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0) — maintainers are always in control';
    expect(
      editableBodyOf(
        `Done.\n\n<sub>Made with [GitRanks Contribute](https://gitranks.com/contribute/pr/6650a1b2c3d4e5f6a7b8c9d0) and Codex (GPT) · Reviewed and submitted by @octocat<br>${say}</sub>`,
      ),
    ).toBe('Done.');
  });

  it("takes out a Learn pull request's footer, on one line or on two", () => {
    const made =
      'Made with [GitRanks Learn](https://gitranks.com/learn/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0), where developers learn on real issues · Claude Code (Opus) wrote this fix and taught it to @mira-dev, who [passed a check on the lesson](https://gitranks.com/learn/lessons/empty-config-abcdef/passes/mira-dev) and submitted it';
    const say =
      'Something off? [Tell us or opt out in one step](https://gitranks.com/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0) — maintainers are always in control';
    expect(editableBodyOf(`Done.\n\n<sub>${made}<br>${say}</sub>`)).toBe('Done.');
    expect(editableBodyOf(`Done.\n\n<sub>${made}</sub><br>\n<sub>${say}</sub>`)).toBe('Done.');
    expect(editableBodyOf(`Done.\n\n<sub>${made}</sub>`)).toBe('Done.');
  });
});

describe('footerPreviewOf', () => {
  it("shows the repo's sentence above the footer, unless the body says it already", () => {
    expect(footerPreviewOf(FOOTER, 'Done.')).toEqual({ text: FOOTER, sentence: false });
    expect(footerPreviewOf(`${SENTENCE}\n\n${FOOTER}`, 'Done.')).toEqual({
      text: `${SENTENCE}\n\n${FOOTER}`,
      sentence: true,
    });
    expect(
      footerPreviewOf(
        `${SENTENCE}\n\n${FOOTER}`,
        `Done.\n\nthis PR was written in part with\nthe assistance of generative AI.`,
      ),
    ).toEqual({
      text: FOOTER,
      sentence: false,
    });
  });
});

describe('endMoveOf: what the user does after an attempt ended', () => {
  it('says the step and where to take it, for a first attempt', () => {
    const end = (endReason: ContributeAttemptEndReason | null, more: Parameters<typeof endMoveOf>[0] | object = {}) =>
      endMoveOf({ endReason, endDetail: null, ...more });
    expect(end('BUDGET')).toMatchObject({ href: '/my/agent/budget#more-limits', link: 'Open More limits' });
    expect(end('KEY_INVALID')).toMatchObject({ href: '/my/agent/key' });
    expect(end('EXHAUSTED')?.text).toMatch(/Claude Console .* Billing/);
    expect(end('CLAIM_LOST')?.text).toMatch(/^Nothing waits on you/);
    expect(end('USER')).toBeNull();
    expect(end(null)).toBeNull();
    // A failed check links to the user's own limit only when it was one of them.
    expect(end('CHECKS_FAILED', { endDetail: 'max_files' })).toMatchObject({ href: '/my/settings/pull-requests#size' });
    expect(end('CHECKS_FAILED', { endDetail: 'secrets' })).toEqual({ text: 'Nothing waits on you.' });
    // A failed submission points at its note only while there is one.
    expect(end('SUBMIT_FAILED')).toEqual({ text: 'Nothing was submitted.' });
    expect(end('SUBMIT_FAILED', { submit: { lastError: { reason: 'x' } } })?.text).toMatch(/note below/);
  });

  it("gives a follow-up only the steps that come before its next run: the rest are its page's own words", () => {
    const run = (endReason: ContributeAttemptEndReason, endDetail: string | null = null) =>
      endMoveOf({ endReason, endDetail, kind: 'FOLLOW_UP' });
    expect(run('BUDGET')).not.toBeNull();
    expect(run('LIMIT_REACHED')).not.toBeNull();
    expect(run('TIMEOUT')).toBeNull();
    expect(run('CHECKS_FAILED')).toBeNull();
    expect(run('CHECKS_FAILED', 'max_changed_lines')).not.toBeNull();
  });
});

describe("a claim the repo's rules refused at the start", () => {
  const refused = (endDetail: string | null, endReason: ContributeAttemptEndReason = 'CANCELLED') => ({
    endReason,
    endDetail,
  });

  it('says which rule and what the user can do, for every gate reason', () => {
    for (const reason of [
      'blocked_by_maintainer',
      'contributor_bar',
      'repo_no_gfi',
      'repo_coordinate_first',
      'repo_issue_gate',
      'first_timers',
      'repo_open_cap',
    ]) {
      expect(endReasonLabelOf(refused(reason))).toMatch(/so the agent did not start\.$/);
      expect(endMoveOf(refused(reason))?.text).toBeTruthy();
    }
    expect(endMoveOf(refused('repo_coordinate_first'))?.text).toMatch(/ask on the issue/);
  });

  it('keeps the plain words for any other cancel', () => {
    expect(endReasonLabelOf(refused(null))).toBe('It was cancelled before it finished.');
    expect(endReasonLabelOf(refused('something_else'))).toBe('It was cancelled before it finished.');
    expect(endMoveOf(refused('repo_no_gfi', 'USER'))).toBeNull();
  });
});

describe('eventLabelOf', () => {
  it("says what a run's DONE pushed: its new commits, or nothing", () => {
    expect(eventLabelOf({ state: 'DONE' }, { patch: 'diff --git a/x b/x' })).toBe('Pushed the new commits');
    expect(eventLabelOf({ state: 'DONE' }, { patch: null })).toBe('Done');
    expect(eventLabelOf({ state: 'DONE' }, { patch: '  ' })).toBe('Done');
  });

  it('says every other state as before', () => {
    expect(eventLabelOf({ state: 'RUNNING' }, { patch: null })).toBe('The agent started');
    expect(eventLabelOf({ state: 'PR_OPEN' }, { patch: 'x' })).toBe('Pull request opened');
  });
});

describe("the own agent's prompt for a change", () => {
  it('names the pull request and the id the follow-up tool takes, and never asks the agent to push', () => {
    const prompt = followUpPromptOf('https://github.com/driftwood-js/driftwood/pull/1419', 'PR_kwDO1419');
    expect(prompt).toBe(
      "Continue my GitRanks pull request https://github.com/driftwood-js/driftwood/pull/1419: start the follow-up with start_follow_up (prId PR_kwDO1419), then submit the change for my review. Don't push anything yourself.",
    );
    expect(prompt).not.toMatch(/\bpush (it|the|your)/i);
  });
});

describe('who makes the changes on a pull request', () => {
  it("is the person's own agent for a Learn pull request and for one their agent made", () => {
    expect(ownAgentChangesOf({ mode: 'LEARN', runner: 'MCP' })).toBe(true);
    expect(ownAgentChangesOf({ mode: 'FIX', runner: 'MCP' })).toBe(true);
  });

  it('is a run of ours for one the hosted agent made', () => {
    expect(ownAgentChangesOf({ mode: 'FIX', runner: 'MANAGED_AGENTS' })).toBe(false);
    expect(ownAgentChangesOf({ mode: 'FIX' })).toBe(false);
  });
});
