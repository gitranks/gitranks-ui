import { describe, expect, it } from 'vitest';

import { editableBodyOf, endMoveOf, endReasonLabelOf, eventLabelOf, footerPreviewOf } from './attempt-format';
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
    expect(end('BUDGET')).toMatchObject({ href: '/contribute/settings/budget#more-limits', link: 'Open More limits' });
    expect(end('KEY_INVALID')).toMatchObject({ href: '/contribute/settings/keys' });
    expect(end('EXHAUSTED')?.text).toMatch(/Claude Console .* Billing/);
    expect(end('CLAIM_LOST')?.text).toMatch(/^Nothing waits on you/);
    expect(end('USER')).toBeNull();
    expect(end(null)).toBeNull();
    // A failed check links to the user's own limit only when it was one of them.
    expect(end('CHECKS_FAILED', { endDetail: 'max_files' })).toMatchObject({ href: '/contribute/settings/agent#prs' });
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
