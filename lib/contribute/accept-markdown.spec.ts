import { describe, expect, it } from 'vitest';

import { prefersMarkdown } from './accept-markdown';

describe('prefersMarkdown', () => {
  it.each([
    ['text/markdown', true],
    ['text/markdown, */*;q=0.1', true],
    ['text/markdown;q=0.9, text/html;q=0.5', true],
    ['text/html, text/markdown;q=0.9', false],
    ['text/markdown, text/html', true],
    ['text/markdown;q=0.9, text/html', false],
    ['*/*', false],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
    ['text/markdown;q=0', false],
    ['', false],
  ])('%s → %s', (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });
});
