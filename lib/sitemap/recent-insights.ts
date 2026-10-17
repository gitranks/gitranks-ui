const DAY_MS = 24 * 60 * 60 * 1000;

type DatedPost = {
  id: string;
  createdAt: string | Date;
  replies: { createdAt: string | Date }[];
};

type Limits = { maxAgeDays: number; maxPosts: number };

/** Whether a post is recent enough for the sitemap. */
export function isRecentPost(createdAt: string | Date, now: Date, maxAgeDays: number): boolean {
  return new Date(createdAt).getTime() >= now.getTime() - maxAgeDays * DAY_MS;
}

/**
 * The posts to list, newest first as the query returns them, each with the time of its latest
 * change: the post itself or its newest reply.
 */
export function recentInsightEntries(posts: DatedPost[], now: Date, { maxAgeDays, maxPosts }: Limits) {
  return posts
    .filter((post) => isRecentPost(post.createdAt, now, maxAgeDays))
    .slice(0, maxPosts)
    .map((post) => ({
      id: post.id,
      lastModified: new Date(
        Math.max(
          ...[post.createdAt, ...post.replies.map((reply) => reply.createdAt)].map((d) => new Date(d).getTime()),
        ),
      ),
    }));
}
