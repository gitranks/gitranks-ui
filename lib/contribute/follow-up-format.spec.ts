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
