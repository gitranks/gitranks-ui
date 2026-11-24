import { describe, expect, it } from 'vitest';

import { myAttempt } from './__fixtures__/home';
import { attemptTitleOf } from './learn-home';
import { LEARN_ABOUT_PATH } from './learn-path';
import { LEARN_ABOUT_METADATA } from './lesson-seo';
import { PICK_ISSUE_PATHS } from '@/lib/workspace/paths';

describe("Learn's words", () => {
  it('names an issue by owner/repo#n until its title is stored', () => {
    expect(attemptTitleOf(myAttempt())).toBe('Route params lose their type after a redirect');
    expect(attemptTitleOf(myAttempt({ title: null }))).toBe('driftwood-js/driftwood#934');
    expect(attemptTitleOf(myAttempt({ title: ' ', repo: null }))).toBe('Issue #934');
  });
});

describe("Learn's addresses", () => {
  it('picks an issue on Issues, and says how Learn works at /learn/about', () => {
    expect([PICK_ISSUE_PATHS.learn, LEARN_ABOUT_PATH]).toEqual(['/learn/issues', '/learn/about']);
  });

  it('points /learn/about at /learn and keeps it out of search engines', () => {
    expect(LEARN_ABOUT_METADATA.alternates).toEqual({ canonical: '/learn' });
    expect(LEARN_ABOUT_METADATA.robots).toEqual({ index: false, follow: false });
  });
});
