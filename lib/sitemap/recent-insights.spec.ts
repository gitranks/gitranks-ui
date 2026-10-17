import { describe, expect, it } from 'vitest';

import { isRecentPost, recentInsightEntries } from './recent-insights';

const now = new Date('2026-10-17T12:00:00.000Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const post = (id: string, createdAt: string, replies: string[] = []) => ({
  id,
  createdAt,
  replies: replies.map((r) => ({ createdAt: r })),
});

describe('isRecentPost', () => {
  it('includes the boundary day and excludes older posts', () => {
    expect(isRecentPost(daysAgo(90), now, 90)).toBe(true);
    expect(isRecentPost(daysAgo(91), now, 90)).toBe(false);
  });
});

describe('recentInsightEntries', () => {
  it('keeps recent posts in order, up to the cap', () => {
    const posts = [post('a', daysAgo(1)), post('b', daysAgo(2)), post('c', daysAgo(3))];

    expect(recentInsightEntries(posts, now, { maxAgeDays: 90, maxPosts: 2 }).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('drops posts past the age limit', () => {
    const posts = [post('a', daysAgo(10)), post('old', daysAgo(120))];

    expect(recentInsightEntries(posts, now, { maxAgeDays: 90, maxPosts: 200 }).map((e) => e.id)).toEqual(['a']);
  });

  it('dates each entry by its latest change, the post or its newest reply', () => {
    const [withReply, withoutReply] = recentInsightEntries(
      [post('a', daysAgo(5), [daysAgo(4), daysAgo(2)]), post('b', daysAgo(6))],
      now,
      { maxAgeDays: 90, maxPosts: 200 },
    );

    expect(withReply.lastModified.toISOString()).toBe(daysAgo(2));
    expect(withoutReply.lastModified.toISOString()).toBe(daysAgo(6));
  });
});
