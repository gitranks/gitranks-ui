import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const { contributeHidden } = await import('./setting-up');

describe('a Contribute page with no view', () => {
  it("sends an account being set up to Contribute's home, which says so", () => {
    expect(() => contributeHidden('setting-up')).toThrow('NEXT_REDIRECT /contribute');
  });

  it("sends a company-managed account to Contribute's home, which says why it can't be used", () => {
    expect(() => contributeHidden('managed')).toThrow('NEXT_REDIRECT /contribute');
  });

  it('is not found otherwise', () => {
    for (const state of ['none', 'failed', 'removed'] as const) {
      expect(() => contributeHidden(state), state).toThrow('NEXT_NOT_FOUND');
    }
  });
});
