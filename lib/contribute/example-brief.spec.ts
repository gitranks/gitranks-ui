import { describe, expect, it } from 'vitest';

import { EXAMPLE_BRIEF, EXAMPLE_BRIEF_ISSUE, EXAMPLE_BRIEF_PR } from './example-brief';

describe('EXAMPLE_BRIEF', () => {
  it('is the shape claim_issue answers, for the linked issue', () => {
    expect(Object.keys(EXAMPLE_BRIEF)).toEqual(['text', 'repo', 'limits', 'submit', 'changesRequested']);
    expect(EXAMPLE_BRIEF.repo.nameWithOwner).toBe('eslint/eslint');
    expect(EXAMPLE_BRIEF.text).toContain('Issue #21438 in eslint/eslint');
    expect(EXAMPLE_BRIEF_ISSUE.url).toBe('https://github.com/eslint/eslint/issues/21438');
    expect(EXAMPLE_BRIEF_PR.url).toBe('https://github.com/eslint/eslint/pull/21487');
  });

  it('names no one: every @mention is @someone, but a team or a scoped package', () => {
    const mentions = EXAMPLE_BRIEF.text.match(/(?<![\w@./-])@[A-Za-z0-9][\w-]*(?![\w/-])/g) ?? [];
    expect(new Set(mentions)).toEqual(new Set(['@someone']));
  });
});
