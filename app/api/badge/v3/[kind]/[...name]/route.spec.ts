import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FACTS_CACHE_CONTROL } from '@/badge/v3/facts-route';
import { packageBig, repoMid, userMid } from '@/badge/v3/fixtures';

const { loaders } = vi.hoisted(() => ({
  loaders: { user: vi.fn(), org: vi.fn(), repo: vi.fn(), package: vi.fn() },
}));

vi.mock('@/badge/v3/load', () => ({
  loadBadgeUser: loaders.user,
  loadBadgeOrg: loaders.org,
  loadBadgeRepo: loaders.repo,
  loadBadgePackage: loaders.package,
}));

const { GET } = await import('./route');

const get = (kind: string, ...name: string[]) =>
  GET(new NextRequest(`https://gitranks.com/api/badge/v3/${kind}/${name.join('/')}`), {
    params: Promise.resolve({ kind, name }),
  });

describe('/api/badge/v3/<kind>/<name>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loaders.user.mockResolvedValue(userMid);
    loaders.repo.mockResolvedValue(repoMid);
    loaders.package.mockResolvedValue(packageBig);
  });

  it('answers a developer and a repository as before, never reading a package', async () => {
    const user = await get('user', userMid.login);
    expect(user.status).toBe(200);
    expect(user.headers.get('Cache-Control')).toBe(FACTS_CACHE_CONTROL.found);

    const repo = await get('repo', ...repoMid.nameWithOwner.split('/'));
    expect(repo.status).toBe(200);
    expect(loaders.package).not.toHaveBeenCalled();
  });

  it("answers a package's facts with the facts cache rules", async () => {
    const response = await get('package', 'npm', 'react-resize-detector');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(FACTS_CACHE_CONTROL.found);
    await expect(response.json()).resolves.toMatchObject({ kind: 'package', name: 'react-resize-detector' });
    expect(loaders.package).toHaveBeenCalledWith('npm', 'react-resize-detector');

    loaders.package.mockResolvedValueOnce(null);
    expect((await get('package', 'npm', '@nebula', 'ui')).status).toBe(404);
  });
});
