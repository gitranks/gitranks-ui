import { describe, expect, it } from 'vitest';

import type { ContributePrSignalKind } from './contribute.types';
import { followUpCanHelp, repoOutReasonOf, repoOutTextOf, signalText, silentTextOf } from './follow-up-format';

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
