import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { after, reportBadgeSeen, renderMediumBadge, renderSmallBadge } = vi.hoisted(() => ({
  after: vi.fn<(task: () => Promise<void>) => void>(),
  reportBadgeSeen: vi.fn<(kind: 'user' | 'repo', name: string) => Promise<void>>(),
  renderMediumBadge: vi.fn<() => Promise<string | undefined>>(),
  renderSmallBadge: vi.fn<() => Promise<string | undefined>>(),
}));

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));
vi.mock('@/badge/badge-seen', () => ({ reportBadgeSeen }));
vi.mock('@/badge/templates/medium/medium.render', () => ({ renderMediumBadge }));
vi.mock('@/badge/templates/small/small.render', () => ({ renderSmallBadge }));

const { GET } = await import('./route');

const PROXY = 'github-camo (876de43e)';
const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36';

const get = (userAgent: string, login = 'OctoCat', query = '') =>
  GET(new NextRequest(`https://gitranks.com/api/badge/${login}${query}`, { headers: { 'User-Agent': userAgent } }), {
    params: Promise.resolve({ login }),
  });

const runAfter = async () => {
  for (const [task] of after.mock.calls) await task();
};

describe("GET /api/badge/[login]: the report of GitHub's image proxy", () => {
  beforeEach(() => {
    after.mockReset();
    reportBadgeSeen.mockReset();
    reportBadgeSeen.mockResolvedValue();
    renderMediumBadge.mockReset();
    renderMediumBadge.mockResolvedValue('<svg/>');
    renderSmallBadge.mockReset();
    renderSmallBadge.mockResolvedValue('<svg/>');
  });

  it('reports a drawn badge after the response, with the login as requested', async () => {
    const response = await get(PROXY);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<svg/>');
    expect(reportBadgeSeen).not.toHaveBeenCalled();
    await runAfter();
    expect(reportBadgeSeen).toHaveBeenCalledExactlyOnceWith('user', 'OctoCat');
  });

  it('schedules nothing for a browser, a bad query or an unknown login', async () => {
    expect((await get(BROWSER)).status).toBe(200);
    expect((await get(PROXY, 'octocat', '?theme=neon')).status).toBe(400);
    renderMediumBadge.mockResolvedValue(undefined);
    await expect(get(PROXY, 'nobody')).rejects.toThrow();

    expect(after).not.toHaveBeenCalled();
  });
});
