import { describe, expect, it } from 'vitest';

import { githubLoginOf, lessonResultPath } from './learn-path';
import { stubTextOf } from './lesson-public';

describe('an old result address', () => {
  it('is written as the links wrote it, and a login is read by its shape alone', () => {
    expect(lessonResultPath('route-cache-miss-8f3k', 'octocat')).toBe(
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat',
    );
    expect(githubLoginOf('Mona-Lisa')).toBe('Mona-Lisa');
    expect(githubLoginOf('mona.lisa')).toBeNull();
    expect(githubLoginOf(7)).toBeNull();
  });
});

describe('a closed lesson', () => {
  it('says why it is closed: removed by its author, hidden, paused, or not there', () => {
    expect(stubTextOf('REMOVED').title).toBe('This lesson was removed by its author');
    expect(stubTextOf('HIDDEN').title).toBe('This lesson is not available');
    expect(stubTextOf('HELD').title).toBe('This lesson is paused');
    expect(stubTextOf('MISSING').title).toBe('This page is not available');
  });
});
