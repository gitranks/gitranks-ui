import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { loadLearnOpen } = vi.hoisted(() => ({ loadLearnOpen: vi.fn(async () => false) }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/learn/learn.data', () => ({ loadLearnOpen }));
vi.mock('@/app/(workspace)/learn/components/learn-tab-view', () => ({ LearnTab: () => null }));

const { default: LearnEarlierPage, metadata } = await import('./page');
const { LearnTab } = await import('@/app/(workspace)/learn/components/learn-tab-view');

/** The page's one read, inside its Suspense. */
const readOf = async () => {
  const page = LearnEarlierPage() as ReactElement<{ children: ReactElement }>;
  const inner = page.props.children;
  return (inner.type as () => Promise<unknown>)();
};

describe("today's Learn at /learn/earlier", () => {
  it('is never indexed, and named for what it does', () => {
    expect(metadata).toEqual({ title: 'Fix a real issue with your agent', robots: { index: false, follow: false } });
  });

  it('is not found to someone Learn is not open to', async () => {
    loadLearnOpen.mockResolvedValueOnce(false);
    await expect(readOf()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it("is today's Learn tab for someone Learn is open to", async () => {
    loadLearnOpen.mockResolvedValueOnce(true);
    const shown = await readOf();
    expect(isValidElement(shown) && shown.type).toBe(LearnTab);
  });
});
