import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/navigation', () => ({ notFound }));

const { default: FixRemovedPage, metadata } = await import('./page');

const props = (number = '57') => ({ params: Promise.resolve({ owner: 'acme', repo: 'widgets', number }) }) as never;

describe('the page of a fix whose pages were removed', () => {
  it('says so, with the pull request on GitHub; never indexed', async () => {
    const page = (await FixRemovedPage(props())) as ReactElement<{ repo: string; number: number }>;
    expect(page.props).toEqual({ repo: 'acme/widgets', number: 57 });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('is not there for an address that names no pull request', async () => {
    await expect(FixRemovedPage(props('x'))).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
