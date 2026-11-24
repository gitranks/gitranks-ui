import { describe, expect, it } from 'vitest';

import {
  clearsAllOf,
  followUpCanHelp,
  handledKindsOf,
  PR_SIGNAL_KINDS,
  repoOutReasonOf,
  repoOutTextOf,
  silentTextOf,
  USERS_SIGNALS,
} from './follow-up-format';

describe("the user's own: a check only they can clear, a comment in the conversation", () => {
  const at = '2026-11-17T09:00:00.000Z';
  const yours = { kind: 'CHECK_YOURS' as const, at, detail: 'deploy-preview: approve the preview; e2e: needs main' };
  const talk = { kind: 'CONVERSATION' as const, at, detail: null };

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
});
