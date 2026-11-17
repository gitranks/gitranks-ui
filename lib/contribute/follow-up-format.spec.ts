import { describe, expect, it } from 'vitest';

import type { ContributePrSignalKind } from './contribute.types';
import {
  clearsAllOf,
  followUpCanHelp,
  handledKindsOf,
  PR_SIGNAL_KINDS,
  repoOutReasonOf,
  repoOutTextOf,
  signalText,
  silentTextOf,
  USERS_SIGNALS,
} from './follow-up-format';

describe('the title signal (a title that breaks the repo rules)', () => {
  it('names the title, and is no work for a follow-up: a retitle fixes it', () => {
    const title = { kind: 'TITLE' as const, at: '2026-11-01T03:00:00.000Z', detail: '[WIP] Null after deleting' };
    expect(signalText(title)).toMatch(
      /^The title breaks the repo's rules \(retitle it on the pull request's page\): \[WIP\] Null after deleting/,
    );
    expect(followUpCanHelp([title])).toBe(false);
    expect(followUpCanHelp([title, { kind: 'COMMENT', at: title.at, detail: null }])).toBe(true);
  });
});

describe('a review bot blocking the merge (openclaw#190186: ClawSweeper asked for proof)', () => {
  it('names the bot and its verdict, and is no work for a follow-up: the proof is the user’s', () => {
    const blocked = {
      kind: 'BOT_BLOCKED' as const,
      at: '2026-11-01T09:30:00.000Z',
      detail: 'clawsweeper: Blocked before merge - 1 item remains: Add real behavior proof',
    };
    expect(signalText(blocked)).toMatch(/^A review bot blocks the merge: clawsweeper: Blocked before merge/);
    expect(followUpCanHelp([blocked])).toBe(false);
    expect(followUpCanHelp([blocked, { kind: 'CHECK_FAILED', at: blocked.at, detail: 'lint' }])).toBe(true);
  });
});

describe('an agreement to sign', () => {
  it('names a DCO by its check, a CLA as before', () => {
    const at = '2026-11-03T10:45:00.000Z';
    expect(signalText({ kind: 'CLA', at, detail: 'DCO' })).toMatch(
      /^Sign the Developer Certificate of Origin \(DCO\): DCO/,
    );
    expect(signalText({ kind: 'CLA', at, detail: 'license/cla' })).toMatch(
      /^Sign the contributor license agreement \(CLA\): license\/cla/,
    );
  });
});

describe("the user's own: a check only they can clear, a comment in the conversation", () => {
  const at = '2026-11-17T09:00:00.000Z';
  const yours = { kind: 'CHECK_YOURS' as const, at, detail: 'deploy-preview: approve the preview; e2e: needs main' };
  const talk = { kind: 'CONVERSATION' as const, at, detail: null };

  it('names each, and is no work for a follow-up', () => {
    expect(signalText(yours)).toMatch(/^A check only you can clear · /);
    expect(signalText(talk)).toMatch(/^Someone commented in the pull request's conversation · /);
    expect(followUpCanHelp([yours])).toBe(false);
    expect(followUpCanHelp([talk])).toBe(false);
    expect(followUpCanHelp([yours, talk])).toBe(false);
  });

  it('keeps a run for what it can act on beside them: a review comment, a failing check', () => {
    expect(followUpCanHelp([talk, { kind: 'COMMENT', at, detail: null }])).toBe(true);
    expect(followUpCanHelp([yours, { kind: 'CHECK_FAILED', at, detail: 'lint' }])).toBe(true);
  });

  it('knows both kinds, so "Mark as handled" may name them and neither reads as unknown', () => {
    expect(PR_SIGNAL_KINDS).toEqual(expect.arrayContaining(['CHECK_YOURS', 'CONVERSATION']));
    expect([USERS_SIGNALS.has('CHECK_YOURS'), USERS_SIGNALS.has('CONVERSATION')]).toEqual([true, true]);
    // The run's kinds stay a run's.
    expect(['COMMENT', 'CHECK_FAILED', 'CHANGES_REQUESTED'].some((kind) => USERS_SIGNALS.has(kind as never))).toBe(
      false,
    );
  });
});

describe('what "Mark as handled" sends', () => {
  it('clears every signal only when the kinds are all that is held, and names them otherwise', () => {
    expect(clearsAllOf(['SILENT'], ['SILENT'])).toBe(true);
    expect(clearsAllOf(['BOT_BLOCKED', 'RUN_ENDED'], ['RUN_ENDED', 'BOT_BLOCKED'])).toBe(true);
    expect(clearsAllOf(['SILENT', 'COMMENT'], ['SILENT'])).toBe(false);
    expect(clearsAllOf([], ['SILENT'])).toBe(false);
    expect(handledKindsOf(['SILENT'], true)).toBeUndefined();
    expect(handledKindsOf(['SILENT'], false)).toEqual(['SILENT']);
    expect(handledKindsOf(undefined, false)).toBeUndefined();
  });

  it('always names a conversation comment and the checks only the user can clear, even alone', () => {
    for (const kind of ['CONVERSATION', 'CHECK_YOURS'] as const) {
      expect(clearsAllOf([kind], [kind])).toBe(false);
      expect(handledKindsOf([kind], clearsAllOf([kind], [kind]))).toEqual([kind]);
    }
    expect(clearsAllOf(['CONVERSATION', 'CHECK_YOURS'], ['CONVERSATION', 'CHECK_YOURS'])).toBe(false);
  });
});

describe("GitRanks' own signals: a silent pull request, a repo out of Contribute", () => {
  const at = '2026-10-28T10:00:00.000Z';
  it('says the day a silent pull request closes and why a repo left, and is no work for a follow-up', () => {
    const silent = { kind: 'SILENT' as const, at, detail: '2026-11-12' };
    expect(signalText(silent)).toMatch(/^No one has looked at it for 30 days: we'll close it on Nov 12 · /);
    expect(signalText({ ...silent, detail: null })).toMatch(/^No one has looked at it for 30 days · /);
    const out = { kind: 'REPO_OUT' as const, at, detail: 'closed_no_ai' };
    expect(signalText(out)).toMatch(
      /^The repo is out of GitRanks Contribute: a maintainer said it takes no AI-made PRs · /,
    );
    expect(signalText({ ...out, detail: 'whatever' })).toMatch(/^The repo is out of GitRanks Contribute · /);
    expect(followUpCanHelp([silent])).toBe(false);
    expect(followUpCanHelp([out])).toBe(false);
    expect(followUpCanHelp([silent, out, { kind: 'COMMENT', at, detail: null }])).toBe(true);
  });

  it('reads the reasons the API names, and none other', () => {
    expect(['closed_no_ai', 'HOSTILE_CLOSE', ' pr_misses ', 'paused', null].map(repoOutReasonOf)).toEqual([
      'closed_no_ai',
      'hostile_close',
      'pr_misses',
      null,
      null,
    ]);
    expect(repoOutTextOf('hostile_close')).toBe(
      'This repo is out of Contribute: a maintainer asked us to stay away. You may want to close this PR.',
    );
    expect(silentTextOf('2026-11-12')).toBe(
      "No one has looked at this PR for 30 days. We'll close it on Nov 12 to keep your profile tidy.",
    );
  });

  it('says something of a kind this UI does not know yet, and offers a run for it', () => {
    const unknown = { kind: 'SOMETHING_NEW' as ContributePrSignalKind, at, detail: 'x' };
    expect(signalText(unknown)).toMatch(/^Something changed on it · /);
    expect(followUpCanHelp([unknown])).toBe(true);
  });
});
