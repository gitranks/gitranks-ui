import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contributeFix, learnFix, learnFixClosed, learnFixOpen } from '@/lib/learn/__fixtures__/fix-page';
import { mergedFix } from '@/lib/learn/__fixtures__/fix-share';
import type { LearnFixPage } from '@/lib/learn/fix-page';
import { fixCardUrlOf, type LearnFixCard } from '@/lib/learn/fix-share-card';
import { learnTimeline, mergedTimeline, stoppedTimeline } from '@/lib/workspace/__fixtures__/pr-timeline';

const { timeline, fix, page, helped } = vi.hoisted(() => ({
  timeline: vi.fn(async (): Promise<unknown> => null),
  fix: vi.fn(
    async (_pr: unknown): Promise<{ fix: LearnFixCard | null; failed: boolean }> => ({ fix: null, failed: false }),
  ),
  page: vi.fn(async (_pr: unknown): Promise<LearnFixPage | null> => null),
  helped: vi.fn(async (_pr: unknown): Promise<unknown> => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/pr-timeline.data', () => ({
  NO_PR: { owner: '_', repo: '_', number: '1' },
  publicPrTimeline: timeline,
  publicPrTimelineHelped: helped,
}));
vi.mock('@/lib/learn/fix-share.data', () => ({ loadFixCard: fix }));
vi.mock('@/lib/learn/fix-page.data', () => ({ loadFixPage: page }));
vi.mock('@/components/header/header', () => ({
  Header: ({ section }: { section: string }) => <div data-header={section} />,
}));
vi.mock('@/components/learn/bar/learn-bar-live', () => ({ LearnBarLive: () => <div data-learn-bar="" /> }));
vi.mock('@/components/learn/bar/learn-bar', () => ({ LearnBar: () => <div data-learn-bar="" /> }));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const { default: PrTimelinePage, generateMetadata } = await import('./page');

const params = Promise.resolve({ owner: 'driftwood-js', repo: 'driftwood', number: '1419' });
/** The fix of the timeline's own pull request. */
const timelineFix: LearnFixCard = { ...mergedFix, repo: 'driftwood-js/driftwood', number: 1419, issueNumber: 871 };

const drawn = async () => renderToStaticMarkup((await PrTimelinePage({ params } as never)) as ReactElement);
const words = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');

beforeEach(() => {
  timeline.mockResolvedValue(mergedTimeline);
  fix.mockReset();
  page.mockReset();
  page.mockResolvedValue(null);
  helped.mockReset();
  helped.mockResolvedValue(null);
});

describe("a pull request timeline's link preview", () => {
  it("shows the fix's picture, title and description, read by the pull request's own name", async () => {
    fix.mockResolvedValueOnce({ fix: timelineFix, failed: false });
    const metadata = await generateMetadata({ params } as never);
    expect(fix).toHaveBeenCalledWith({ nameWithOwner: 'driftwood-js/driftwood', number: 1419 });
    const image = {
      url: `https://gitranks.com${fixCardUrlOf(timelineFix)}`,
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
      { fix: null, failed: false },
      { fix: { ...timelineFix, state: 'CLOSED' as const }, failed: false },
      { fix: null, failed: true },
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

describe('"How it was made"', () => {
  it("draws a Contribute pull request in Contribute's header, with no row and no Learn part", async () => {
    page.mockResolvedValue(contributeFix);
    const html = await drawn();
    expect(html).toContain('data-header="contribute"');
    expect(html).not.toContain('data-learn-bar');
    expect(html).not.toContain('data-fix-row');
    expect(html).not.toContain('data-fix-learn-block');
    const text = words(html);
    for (const line of [
      'Normalize route paths before the layout cache lookup',
      'merged 26 Oct',
      'Made with GitRanks Contribute, powered by Claude (Opus). mira-dev reviewed and submitted it.',
      'How this pull request was made',
      'Claude (Opus), run by GitRanks, wrote the fix in 38 minutes.',
      'Merged into driftwood-js/driftwood.',
      'The change',
      'For the project’s maintainers',
      '4 people said it helped',
      'What a GitRanks Contribute pull request is',
      'How Contribute works',
    ]) {
      expect(text).toContain(line);
    }
    expect(html).toContain(`/contribute/maintainers/report?from=${mergedTimeline.attemptId}&amp;kind=helped`);
    expect(html).toContain(`${mergedTimeline.url}/files`);
    expect(html).toContain('/contribute/pr/driftwood-js/driftwood/1419/timeline.md');
  });

  it('draws a page with no fix read (an older API) as a Contribute one, never an error', async () => {
    const html = await drawn();
    expect(html).toContain('data-header="contribute"');
    expect(html).toContain('data-fix-made');
  });

  it('throws on a failed read, so no cache keeps a Learn fix drawn as a Contribute pull request', async () => {
    page.mockRejectedValue(new Error('socket hang up'));
    await expect(drawn()).rejects.toThrow('socket hang up');
    await expect(generateMetadata({ params } as never)).rejects.toThrow('socket hang up');
  });

  it("names the agent the pull request was made with, the contributor's own one included", async () => {
    timeline.mockResolvedValue({ ...mergedTimeline, ownAgent: true, agentPhrase: 'Codex (GPT)' });
    page.mockResolvedValue(contributeFix);
    const text = words(await drawn());
    expect(text).toContain('Made with GitRanks Contribute and Codex (GPT). mira-dev reviewed and submitted it.');
    expect(text).toContain('Codex (GPT), mira-dev’s own agent, wrote the fix');
    expect(text).not.toContain('Claude');
  });

  it('keeps the count beside the named people when some said it helped without a name', async () => {
    helped.mockResolvedValue({ helpedBy: ['mara-k', 'tomas-r'], helpedNamed: 2 });
    timeline.mockResolvedValue({ ...mergedTimeline, helped: 7 });
    const text = words(await drawn());
    expect(text).toContain('7 people said it helped');
    expect(text).toContain('+5 more');
    expect(text).not.toContain('Said it helped');
    // Every one of them named: the names alone.
    timeline.mockResolvedValue({ ...mergedTimeline, helped: 2 });
    const named = words(await drawn());
    expect(named).toContain('Said it helped');
    expect(named).not.toContain('people said it helped');
    expect(named).not.toContain('more');
  });

  it("describes a Learn fix as Learn's in its structured data, and a Contribute one as Contribute's", async () => {
    const crumbsOf = (html: string) => {
      const payloads = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].flatMap(
        ([, json]) => JSON.parse(json) as unknown[],
      ) as Record<string, unknown>[];
      const crumbs = payloads.find((payload) => payload['@type'] === 'BreadcrumbList') as {
        itemListElement: { name: string }[];
      };
      const list = payloads.find((payload) => payload['@type'] === 'ItemList') as {
        itemListElement: { name: string }[];
      };
      return { first: crumbs.itemListElement[0].name, rows: list.itemListElement.map(({ name }) => name) };
    };
    timeline.mockResolvedValue(learnTimeline);
    page.mockResolvedValue(learnFix);
    const learn = crumbsOf(await drawn());
    expect(learn.first).toBe('GitRanks Learn');
    // The rows the page lists, not the old milestones.
    expect(learn.rows).toEqual(['Fix', 'Walkthrough', 'Approved', 'Round 1', 'Review', 'Merged']);
    page.mockResolvedValue(contributeFix);
    expect(crumbsOf(await drawn()).first).toBe('GitRanks Contribute');
  });

  it("draws a Learn fix under Learn's bar, with the two views, its Learn part and its walkthrough row", async () => {
    timeline.mockResolvedValue(learnTimeline);
    page.mockResolvedValue(learnFix);
    helped.mockResolvedValue({ helpedBy: ['mara-k'], helpedNamed: 3 });
    const html = await drawn();
    expect(html).toContain('data-header="learn"');
    expect(html).toContain('data-learn-bar');
    expect(html).toContain('href="/learn/fixes/driftwood-js/driftwood/1419"');
    expect(html).toMatch(/aria-current="page"[^>]*data-fix-view="made"/);
    const text = words(html);
    for (const line of [
      'Fixed by mira-dev with Claude (Opus), run by GitRanks.',
      'mira-dev answered 4 questions about this change before sending it',
      'See the questions and mira-dev’s answers',
      'Answer them yourself',
      'The lesson behind it: Normalize a key before you look it up',
      'mira-dev answered 4 questions about the change.',
      '4 people said it helped',
      '+3 more',
      'What a GitRanks Learn pull request is',
      'How Learn works',
    ]) {
      expect(text).toContain(line);
    }
    expect(html).toContain('href="/profile/mara-k"');
  });

  it('draws a Learn fix closed without a merge with no switch and no "Answer them yourself"', async () => {
    timeline.mockResolvedValue({ ...learnTimeline, state: 'CLOSED', mergedAt: null });
    page.mockResolvedValue(learnFixClosed);
    const html = await drawn();
    expect(html).toContain('data-fix-row');
    expect(html).not.toContain('data-fix-view');
    expect(words(html)).not.toContain('Answer them yourself');
    expect(words(html)).toContain('The project closed it without merging.');
  });

  it('says under the card that a maintainer stopped the work', async () => {
    timeline.mockResolvedValue(stoppedTimeline);
    expect(words(await drawn())).toContain(
      'A maintainer stopped GitRanks work on this pull request. It stays as it is on GitHub.',
    );
  });
});

describe('search engines on "How it was made"', () => {
  it('point to "Learn from it" for a merged Learn fix, and keep this page for any other', async () => {
    fix.mockResolvedValue({ fix: null, failed: false });
    page.mockResolvedValue(learnFix);
    expect((await generateMetadata({ params } as never)).alternates?.canonical).toBe(
      '/learn/fixes/driftwood-js/driftwood/1419',
    );
    // An open Learn fix is listed in the sitemap here, so this page is its own canonical until it merges.
    for (const other of [learnFixOpen, learnFixClosed, contributeFix, null]) {
      page.mockResolvedValue(other);
      expect((await generateMetadata({ params } as never)).alternates?.canonical).toBe(
        '/contribute/pr/driftwood-js/driftwood/1419',
      );
    }
  });
});
