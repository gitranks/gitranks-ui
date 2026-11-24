import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadFixAddress, notFound } = vi.hoisted(() => ({
  loadFixAddress: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/walkthrough.data', () => ({ loadFixAddress }));

const { default: FixRemovedPage, metadata } = await import('./page');

const props = { params: Promise.resolve({ owner: 'acme', repo: 'widgets', number: '57' }) };

beforeEach(() => {
  loadFixAddress.mockReset();
});

describe('the page of a fix whose pages were removed', () => {
  it('says so, with the pull request on GitHub; never indexed', async () => {
    loadFixAddress.mockResolvedValue({ state: 'REMOVED', owner: 'acme', repo: 'widgets', number: 57, login: null });
    const page = (await FixRemovedPage(props as never)) as ReactElement<{ repo: string; number: number }>;
    expect(page.props).toEqual({ repo: 'acme/widgets', number: 57 });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('is not there for a fix that was not removed, or one the read cannot tell', async () => {
    for (const address of [{ state: 'LIVE' }, null]) {
      loadFixAddress.mockResolvedValueOnce(address);
      await expect(FixRemovedPage(props as never)).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });
});
