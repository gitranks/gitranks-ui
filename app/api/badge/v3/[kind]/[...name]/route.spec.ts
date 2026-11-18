import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FACTS_CACHE_CONTROL } from '@/badge/v3/facts-route';
import { packageBig, repoMid, userMid } from '@/badge/v3/fixtures';

const { loaders, packagesPublic, requestMaySeePackages } = vi.hoisted(() => ({
  loaders: { user: vi.fn(), org: vi.fn(), repo: vi.fn(), package: vi.fn() },
  packagesPublic: vi.fn<() => Promise<boolean>>(),
  requestMaySeePackages: vi.fn<(req: { headers: Headers }) => Promise<boolean>>(),
}));

vi.mock('@/badge/v3/load', () => ({
  loadBadgeUser: loaders.user,
  loadBadgeOrg: loaders.org,
  loadBadgeRepo: loaders.repo,
  loadBadgePackage: loaders.package,
}));
vi.mock('@/lib/packages/packages-gate', () => ({ packagesPublic, requestMaySeePackages }));

const { GET } = await import('./route');

const get = (kind: string, ...name: string[]) =>
  GET(new NextRequest(`https://gitranks.com/api/badge/v3/${kind}/${name.join('/')}`), {
    params: Promise.resolve({ kind, name }),
  });

describe('/api/badge/v3/<kind>/<name>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    packagesPublic.mockResolvedValue(false);
    requestMaySeePackages.mockResolvedValue(false);
    loaders.user.mockResolvedValue(userMid);
    loaders.repo.mockResolvedValue(repoMid);
    loaders.package.mockResolvedValue(packageBig);
  });

  it('answers a developer and a repository as before, never asking about packages', async () => {
    const user = await get('user', userMid.login);
    expect(user.status).toBe(200);
    expect(user.headers.get('Cache-Control')).toBe(FACTS_CACHE_CONTROL.found);

    const repo = await get('repo', ...repoMid.nameWithOwner.split('/'));
    expect(repo.status).toBe(200);
    expect(packagesPublic).not.toHaveBeenCalled();
    expect(requestMaySeePackages).not.toHaveBeenCalled();
    expect(loaders.package).not.toHaveBeenCalled();
  });

  it("is not found, private, for a package's facts asked by anyone packages are hidden from", async () => {
    const response = await get('package', 'npm', 'react-resize-detector');

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ error: 'Not found' });
    expect(loaders.package).not.toHaveBeenCalled();
  });

  it("answers a package's facts to a preview viewer, kept by nobody", async () => {
    requestMaySeePackages.mockResolvedValue(true);
    const response = await get('package', 'npm', 'react-resize-detector');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toMatchObject({ kind: 'package', name: 'react-resize-detector' });
    expect(loaders.package).toHaveBeenCalledWith('react-resize-detector');

    loaders.package.mockResolvedValueOnce(null);
    const missing = await get('package', 'npm', '@nebula', 'ui');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('answers with the facts cache rules once packages are open to everyone', async () => {
    packagesPublic.mockResolvedValue(true);
    const response = await get('package', 'npm', 'react-resize-detector');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(FACTS_CACHE_CONTROL.found);
    expect(requestMaySeePackages).not.toHaveBeenCalled();
  });
});
