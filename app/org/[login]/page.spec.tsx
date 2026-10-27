import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OrgPage from './page';
import { loadBadgeOrgCard } from '@/badge/v3/load';
import { fetchOrg } from '@/graphql/helpers/fetch-org';

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-org', () => ({ fetchOrg: vi.fn() }));
vi.mock('@/badge/v3/load', () => ({ loadBadgeOrgCard: vi.fn() }));

const ORG = { login: 'nebula', s: 312_000, rankOrg: { s: 12, sM: 15 }, topRepos: [], hasActivity: false, pulse: null };

const render = () => OrgPage({ params: Promise.resolve({ login: 'nebula' }) } as PageProps<'/org/[login]'>);

describe('organization page', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(fetchOrg).mockResolvedValue(ORG as unknown as Awaited<ReturnType<typeof fetchOrg>>);
  });

  it('is kept for hours when the badge data reads', async () => {
    vi.mocked(loadBadgeOrgCard).mockResolvedValue(null);
    await render();

    expect(vi.mocked(cacheLife).mock.calls).toEqual([['hours']]);
  });

  it('is kept for minutes when the badge data fails to read, and still renders', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadBadgeOrgCard).mockRejectedValue(new Error('down'));

    expect(await render()).toBeTruthy();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
    error.mockRestore();
  });

  it('starts the badge read with the page read, not after it', async () => {
    let orgRead: (value: Awaited<ReturnType<typeof fetchOrg>>) => void = () => {};
    vi.mocked(fetchOrg).mockReturnValue(new Promise((resolve) => (orgRead = resolve)));
    vi.mocked(loadBadgeOrgCard).mockReset().mockResolvedValue(null);

    const page = render();
    await Promise.resolve();
    await Promise.resolve();
    expect(loadBadgeOrgCard).toHaveBeenCalledWith('nebula');
    orgRead(ORG as unknown as Awaited<ReturnType<typeof fetchOrg>>);
    await page;
  });
});
