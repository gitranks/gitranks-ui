import { describe, expect, it } from 'vitest';

import { followUpCanHelp, signalText } from './follow-up-format';

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
    expect(signalText(blocked)).toMatch(
      /^A review bot blocks the merge \(see its comment on the pull request's page\): clawsweeper: Blocked before merge/,
    );
    expect(followUpCanHelp([blocked])).toBe(false);
    expect(followUpCanHelp([blocked, { kind: 'CHECK_FAILED', at: blocked.at, detail: 'lint' }])).toBe(true);
  });
});
