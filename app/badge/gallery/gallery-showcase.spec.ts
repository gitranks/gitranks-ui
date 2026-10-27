import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchShowcaseNames, loadShowcase } from './gallery-showcase';
import { fetchLeaderboards, fetchTopOrgs, fetchTopRepos } from '@/app/components/landing/landing-data';
import { orgBig, repoBig, userBig } from '@/badge/v3/fixtures';
import { loadBadgeOrg, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('@/app/components/landing/landing-data', () => ({
  fetchLeaderboards: vi.fn(),
  fetchTopRepos: vi.fn(),
  fetchTopOrgs: vi.fn(),
}));
vi.mock('@/badge/v3/load', () => ({ loadBadgeUser: vi.fn(), loadBadgeRepo: vi.fn(), loadBadgeOrg: vi.fn() }));

type Leaderboards = Awaited<ReturnType<typeof fetchLeaderboards>>;
type TopRepos = Awaited<ReturnType<typeof fetchTopRepos>>;
type TopOrgs = Awaited<ReturnType<typeof fetchTopOrgs>>;

describe('fetchShowcaseNames', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(fetchLeaderboards).mockResolvedValue({
      s: [{ user: { login: 'octo-big' } }],
      c: [],
      f: [],
    } as unknown as Leaderboards);
    vi.mocked(fetchTopRepos).mockResolvedValue([{ repo: { nameWithOwner: 'nebula/ui' } }] as unknown as TopRepos);
    vi.mocked(fetchTopOrgs).mockResolvedValue([{ organization: { login: 'nebula' } }] as unknown as TopOrgs);
  });

  it("names each ranking's #1 and keeps them for a day", async () => {
    expect(await fetchShowcaseNames()).toEqual({
      names: { user: 'octo-big', repo: 'nebula/ui', org: 'nebula' },
      ok: true,
    });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['days']]);
  });

  it('leaves out a ranking that fails or is empty, and keeps the rest for minutes', async () => {
    vi.mocked(fetchLeaderboards).mockRejectedValue(new Error('down'));
    vi.mocked(fetchTopOrgs).mockResolvedValue([]);

    expect(await fetchShowcaseNames()).toEqual({ names: { user: null, repo: 'nebula/ui', org: null }, ok: false });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });
});

describe('loadShowcase', () => {
  beforeEach(() => {
    vi.mocked(loadBadgeUser).mockResolvedValue(userBig);
    vi.mocked(loadBadgeRepo).mockResolvedValue(repoBig);
    vi.mocked(loadBadgeOrg).mockResolvedValue(orgBig);
  });

  it("reads each kind's badge data by its name", async () => {
    expect(await loadShowcase('user', 'octo-big')).toEqual({ facts: userBig, ok: true });
    expect(await loadShowcase('repo', 'nebula/ui')).toEqual({ facts: repoBig, ok: true });
    expect(loadBadgeRepo).toHaveBeenCalledWith('nebula', 'ui');
    expect(await loadShowcase('org', 'nebula')).toEqual({ facts: orgBig, ok: true });
  });

  it('is not ok without a #1, for an unknown one, or when the read fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadBadgeOrg).mockResolvedValue(null);
    vi.mocked(loadBadgeUser).mockRejectedValue(new Error('down'));

    expect(await loadShowcase('repo', null)).toEqual({ facts: null, ok: false });
    expect(await loadShowcase('org', 'nebula')).toEqual({ facts: null, ok: false });
    expect(await loadShowcase('user', 'octo-big')).toEqual({ facts: null, ok: false });
    error.mockRestore();
  });
});
