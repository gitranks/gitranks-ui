import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { maintainerFacts, prCard } from '@/lib/contribute/__fixtures__/maintainers';

const { loadPrStrip, publicTimelinePathOf } = vi.hoisted(() => ({
  loadPrStrip: vi.fn(),
  publicTimelinePathOf: vi.fn(),
}));

vi.mock('@/app/(public)/contribute/maintainers/actions', () => ({
  signInAsMaintainer: vi.fn(),
  optOutMaintainerRepos: vi.fn(),
  optInMaintainerRepos: vi.fn(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/components/workspace/scroll-to-hash', () => ({ ScrollToHash: () => <span data-scroll-to-hash /> }));
vi.mock('@/app/contribute/components/launched-more-pages', () => ({ LaunchedMorePages: () => null }));
vi.mock('@/app/contribute/components/contribute-badge-preview', () => ({ ContributeBadgePreview: () => null }));
vi.mock('@/lib/contribute/maintainers.data', () => ({ loadMaintainerRepos: vi.fn() }));
vi.mock('@/lib/contribute/pr-feedback.data', () => ({
  loadMaintainerFacts: vi.fn(async () => maintainerFacts()),
  loadPrStrip,
}));
vi.mock('@/lib/workspace/pr-timeline.data', () => ({ publicTimelinePathOf }));

const { default: MaintainersPage } = await import('./page');

const FROM = '6650a1b2c3d4e5f6a7b8c9d0';

/** The card on top as the page streams it: the Suspense boundary's child, awaited. */
async function stripOf(searchParams: Record<string, string>) {
  const page = (await MaintainersPage({
    searchParams: Promise.resolve(searchParams),
    params: Promise.resolve({}),
  })) as ReactElement<{ strip: ReactElement<{ children: ReactElement }> }>;
  const slot = page.props.strip.props.children;
  const drawn = await (slot.type as (props: unknown) => Promise<ReactNode>)(slot.props);
  return drawn ? renderToStaticMarkup(drawn as ReactElement) : '';
}

describe('the page for maintainers', () => {
  beforeEach(() => {
    loadPrStrip.mockReset();
    publicTimelinePathOf.mockReset().mockResolvedValue(null);
  });

  it('lands on the part the address names once the card from a pull request is in place', async () => {
    loadPrStrip.mockResolvedValue(prCard({ learn: { slug: null } }));
    const html = await stripOf({ from: FROM });

    expect(html).toContain(`data-pr-strip="${FROM}"`);
    expect(html).toContain('data-scroll-to-hash');
    expect(html.indexOf('data-pr-strip')).toBeLessThan(html.indexOf('data-scroll-to-hash'));
  });

  it('draws no card, and moves nothing, for a pull request it cannot read', async () => {
    loadPrStrip.mockResolvedValue(null);

    expect(await stripOf({ from: FROM })).toBe('');
  });
});
