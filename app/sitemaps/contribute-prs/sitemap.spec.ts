import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readPublicPrTimelines, loadMergedFixKeys, cacheLife } = vi.hoisted(() => ({
  readPublicPrTimelines: vi.fn(),
  loadMergedFixKeys: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('@/lib/workspace/pr-timeline.data', () => ({ readPublicPrTimelines }));
vi.mock('@/lib/learn/fix-page.data', () => ({ loadMergedFixKeys }));

const { default: sitemap } = await import('./sitemap');

const items = [
  { nameWithOwner: 'acme/widgets', number: 42, modifiedAt: '2026-11-18T10:00:00.000Z' },
  { nameWithOwner: 'acme/gadgets', number: 7, modifiedAt: '2026-11-18T10:00:00.000Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
});

describe('the pull request pages sitemap', () => {
  it('lists each page at its canonical, a merged Learn fix at "Learn from it", kept for hours', async () => {
    readPublicPrTimelines.mockResolvedValueOnce(items);
    loadMergedFixKeys.mockResolvedValueOnce(new Set(['acme/widgets#42']));
    expect((await sitemap()).map((entry) => entry.url)).toEqual([
      'https://gitranks.com/learn/fixes/acme/widgets/42',
      'https://gitranks.com/contribute/pr/acme/gadgets/7',
    ]);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('hours');
  });

  it('lists none, for minutes, while the merged fixes cannot be read: no canonical is known', async () => {
    readPublicPrTimelines.mockResolvedValueOnce(items);
    loadMergedFixKeys.mockResolvedValueOnce(null);
    expect(await sitemap()).toEqual([]);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });
});
