import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notFoundUnlessPackagesPublic, packagesPublicNow } from './packages-public';
import { packagesPublic } from '@/lib/packages/packages-gate';

const steps: string[] = [];

vi.mock('next/server', () => ({
  connection: vi.fn(async () => {
    steps.push('connection');
  }),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  }),
}));
vi.mock('@/lib/packages/packages-gate', () => ({ packagesPublic: vi.fn() }));

describe('whether package pages are open to everyone, for the sitemaps and llms.txt', () => {
  beforeEach(() => {
    steps.length = 0;
    vi.mocked(packagesPublic)
      .mockReset()
      .mockImplementation(async () => {
        steps.push('gate');
        return false;
      });
  });

  it('asks the gate per request, never before the request is known', async () => {
    expect(await packagesPublicNow()).toBe(false);
    expect(steps).toEqual(['connection', 'gate']);
  });

  it('answers 404 until the pages are open to everyone', async () => {
    await expect(notFoundUnlessPackagesPublic()).rejects.toThrow('404');

    vi.mocked(packagesPublic).mockResolvedValue(true);
    await expect(notFoundUnlessPackagesPublic()).resolves.toBeUndefined();
  });
});
