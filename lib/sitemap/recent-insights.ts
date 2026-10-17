const DAY_MS = 24 * 60 * 60 * 1000;

type DatedPost = {
  id: string;
  createdAt: string | Date;
  replies: { createdAt: string | Date }[];
};

type Limits = { maxAgeDays: number; maxPosts: number };

/** Epoch milliseconds, or `NaN` for a date that doesn't parse. */
const toTime = (date: string | Date) => new Date(date).getTime();

/** Whether a post is recent enough for the sitemap; a post whose date doesn't parse isn't. */
export function isRecentPost(createdAt: string | Date, now: Date, maxAgeDays: number): boolean {
  return toTime(createdAt) >= now.getTime() - maxAgeDays * DAY_MS;
}

/**
 * The posts to list, newest first as the query returns them, each with the time of its latest
 * change: the post itself or its newest reply. A post that shows up twice (new posts shift the
 * pages between requests) is listed once, and a reply date that doesn't parse is ignored.
 */
export function recentInsightEntries(posts: DatedPost[], now: Date, { maxAgeDays, maxPosts }: Limits) {
  const seen = new Set<string>();

  return posts
    .filter((post) => {
      if (seen.has(post.id) || !isRecentPost(post.createdAt, now, maxAgeDays)) {
        return false;
      }

      seen.add(post.id);
      return true;
    })
    .slice(0, maxPosts)
    .map((post) => {
      const replyTimes = post.replies.map((reply) => toTime(reply.createdAt)).filter((time) => !Number.isNaN(time));

      return { id: post.id, lastModified: new Date(Math.max(toTime(post.createdAt), ...replyTimes)) };
    });
}
