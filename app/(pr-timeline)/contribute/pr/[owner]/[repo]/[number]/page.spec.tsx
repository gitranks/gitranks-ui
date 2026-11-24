import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mergedTimeline } from '@/lib/contribute/__fixtures__/pr-timeline';
import { mergedFix } from '@/lib/learn/__fixtures__/fix-share';
import { fixCardUrlOf, type LearnFixCard } from '@/lib/learn/fix-share-card';

const { timeline, fix } = vi.hoisted(() => ({
  timeline: vi.fn(async (): Promise<unknown> => null),
  fix: vi.fn(
    async (_pr: unknown): Promise<{ fix: LearnFixCard | null; failed: boolean; learnOpen: boolean }> => ({
      fix: null,
      failed: false,
      learnOpen: true,
    }),
  ),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/contribute/pr-timeline.data', () => ({
  NO_PR: { owner: '_', repo: '_', number: '1' },
  publicPrTimeline: timeline,
}));
vi.mock('@/lib/learn/fix-share.data', () => ({ loadFixCard: fix }));
vi.mock('@/app/contribute/components/pr-timeline-view', () => ({ PrTimelineScreen: () => null }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const { generateMetadata } = await import('./page');

const params = Promise.resolve({ owner: 'driftwood-js', repo: 'driftwood', number: '1419' });
/** The fix of the timeline's own pull request. */
const timelineFix: LearnFixCard = { ...mergedFix, repo: 'driftwood-js/driftwood', number: 1419, issueNumber: 871 };

beforeEach(() => {
  timeline.mockResolvedValue(mergedTimeline);
  fix.mockReset();
});

describe("a pull request timeline's link preview", () => {
  it("shows the fix's picture, title and description, read by the pull request's own name", async () => {
    fix.mockResolvedValueOnce({ fix: timelineFix, failed: false, learnOpen: false });
    const metadata = await generateMetadata({ params } as never);
    expect(fix).toHaveBeenCalledWith({ nameWithOwner: 'driftwood-js/driftwood', number: 1419 });
    const image = {
      url: `https://gitranks.com${fixCardUrlOf(timelineFix, false)}`,
      width: 1200,
      height: 630,
      alt: timelineFix.title,
    };
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      url: '/contribute/pr/driftwood-js/driftwood/1419',
      title: `${timelineFix.title} · driftwood-js/driftwood #871`,
      description: 'Fixed by octocat with Claude Code, merged on 20 Nov 2026. See how the fix was made.',
      images: [image],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: [image] });
    // The page's own title, for search results, stays the timeline's.
    expect(metadata.title).toBe('Normalize route paths before the layout cache lookup · driftwood-js/driftwood#1419');
  });

  it('names no picture without a fix, for a closed one, or when it cannot be read', async () => {
    for (const read of [
      { fix: null, failed: false, learnOpen: true },
      { fix: { ...timelineFix, state: 'CLOSED' as const }, failed: false, learnOpen: true },
      { fix: null, failed: true, learnOpen: true },
    ]) {
      fix.mockResolvedValueOnce(read);
      const metadata = await generateMetadata({ params } as never);
      expect(metadata.openGraph?.images).toBeUndefined();
      expect(metadata.twitter).toMatchObject({ card: 'summary' });
    }
  });

  it('reads no fix for a page that is not shown', async () => {
    timeline.mockResolvedValueOnce(null);
    const metadata = await generateMetadata({ params } as never);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(fix).not.toHaveBeenCalled();
  });
});
