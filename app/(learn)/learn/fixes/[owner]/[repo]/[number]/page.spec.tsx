import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contributeFix, learnFix, learnFixClosed, learnFixOpen } from '@/lib/learn/__fixtures__/fix-page';
import type { LearnFixPage } from '@/lib/learn/fix-page';
import { mergedTimeline, openTimeline } from '@/lib/workspace/__fixtures__/pr-timeline';

const { timeline, page, notFound, redirect } = vi.hoisted(() => ({
  timeline: vi.fn(async (_pr: unknown): Promise<unknown> => null),
  page: vi.fn(async (_pr: unknown): Promise<LearnFixPage | null> => null),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound, redirect }));
vi.mock('@/lib/workspace/pr-timeline.data', () => ({
  NO_PR: { owner: '_', repo: '_', number: '1' },
  publicPrTimeline: timeline,
}));
vi.mock('@/lib/learn/fix-page.data', () => ({ loadFixPage: page }));
vi.mock('@/components/learn/fix/learn-from-it', () => ({
  LearnFromIt: ({ fix, pullRequest, children }: { fix: LearnFixPage; pullRequest: string; children: unknown }) => (
    <div data-learn-from-it={fix.fixer} data-pull-request={pullRequest}>
      {children as never}
    </div>
  ),
}));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const { default: LearnFixPageView, generateMetadata } = await import('./page');

const props = (number = '1419') => ({
  params: Promise.resolve({ owner: 'driftwood-js', repo: 'driftwood', number }),
});
const drawn = async () => {
  const tree = (await LearnFixPageView(props() as never)) as ReactElement;
  return renderToStaticMarkup(tree);
};
const words = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');

beforeEach(() => {
  timeline.mockReset();
  timeline.mockResolvedValue(mergedTimeline);
  page.mockReset();
  page.mockResolvedValue(learnFix);
  redirect.mockClear();
  notFound.mockClear();
});

describe('"Learn from it"', () => {
  it('draws the shared frame, the Learn part, the change and the foot, with its structured data', async () => {
    const html = await drawn();
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toMatch(/aria-current="page"[^>]*data-fix-view="learn"/);
    expect(html).toContain('href="/contribute/pr/driftwood-js/driftwood/1419"');
    expect(html).toContain('href="/learn/issues?fixed=1"');
    expect(html).toContain('data-learn-from-it="mira-dev"');
    expect(html).toContain('data-pull-request="/my/pull-requests/driftwood-js/driftwood/871?from=learn"');
    const text = words(html);
    for (const line of [
      'Normalize route paths before the layout cache lookup',
      'merged 26 Oct',
      'Fixed by mira-dev with Claude (Opus), run by GitRanks.',
      'The change',
      'See the diff on GitHub',
      'Markdown version',
      'How Learn works',
    ]) {
      expect(text).toContain(line);
    }
    expect(html).toContain('href="/contribute/pr/driftwood-js/driftwood/1419/timeline.md"');
    expect(timeline).toHaveBeenCalledWith({ nameWithOwner: 'driftwood-js/driftwood', number: 1419 });
  });

  it('says an open fix is not merged yet', async () => {
    timeline.mockResolvedValue(openTimeline);
    page.mockResolvedValue(learnFixOpen);
    const text = words(await drawn());
    expect(text).toContain('open since 24 Oct');
    expect(text).toContain('Sent by mira-dev with Claude (Opus), run by GitRanks. The project has not merged it yet.');
  });

  it('sends a pull request with no such view, or none read (an older API), to "How it was made"', async () => {
    for (const other of [contributeFix, learnFixClosed, null]) {
      page.mockResolvedValue(other);
      await expect(drawn()).rejects.toThrow('NEXT_REDIRECT /contribute/pr/driftwood-js/driftwood/1419');
    }
  });

  it('is the not-found page when the timeline is not there, or the address names no pull request', async () => {
    timeline.mockResolvedValue(null);
    await expect(drawn()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(LearnFixPageView(props('057') as never)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('throws a failed read as it is, never a 404 or a redirect a cache would keep', async () => {
    timeline.mockRejectedValue(new Error('down'));
    await expect(drawn()).rejects.toThrow(/^down$/);
    timeline.mockResolvedValue(mergedTimeline);
    page.mockRejectedValue(new Error('socket hang up'));
    await expect(drawn()).rejects.toThrow(/^socket hang up$/);
    await expect(generateMetadata(props() as never)).rejects.toThrow(/^socket hang up$/);
    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('search engines on "Learn from it"', () => {
  it('keep it as the canonical, indexed, with its Markdown copy beside it', async () => {
    const metadata = await generateMetadata(props() as never);
    expect(metadata.title).toBe('Learn from a fix: Normalize route paths before the layout cache lookup');
    expect(metadata.alternates?.canonical).toBe('/learn/fixes/driftwood-js/driftwood/1419');
    expect(metadata.alternates?.types).toEqual({
      'text/markdown': '/contribute/pr/driftwood-js/driftwood/1419/timeline.md',
    });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.description).toBe(
      'How mira-dev fixed driftwood-js/driftwood #871 with their agent: 4 questions on the change, and the lesson it used, Normalize a key before you look it up.',
    );
  });

  it('keep nothing that has no such view', async () => {
    page.mockResolvedValue(contributeFix);
    expect((await generateMetadata(props() as never)).robots).toEqual({ index: false, follow: false });
  });
});
