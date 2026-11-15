import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InlineBadgeResult } from '@/badge/templates/inline/inline.render';

const { after, reportBadgeSeen, renderInlineBadgeResult } = vi.hoisted(() => ({
  after: vi.fn<(task: () => Promise<void>) => void>(),
  reportBadgeSeen: vi.fn<(kind: 'user' | 'repo', name: string) => Promise<void>>(),
  renderInlineBadgeResult: vi.fn<() => Promise<InlineBadgeResult>>(),
}));

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));
vi.mock('@/badge/badge-seen', () => ({ reportBadgeSeen }));
vi.mock('@/badge/templates/inline/inline.render', () => ({ renderInlineBadgeResult }));

const { GET } = await import('./route');

const PROXY = 'github-camo (876de43e)';
const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36';

const get = (userAgent: string, login = 'OctoCat', query = '') =>
  GET(new NextRequest(`https://gitranks.com/api/badge/v2/${login}${query}`, { headers: { 'User-Agent': userAgent } }), {
    params: Promise.resolve({ login }),
  });

const runAfter = async () => {
  for (const [task] of after.mock.calls) await task();
};

describe("GET /api/badge/v2/[login]: the report of GitHub's image proxy", () => {
  beforeEach(() => {
    after.mockReset();
    reportBadgeSeen.mockReset();
    reportBadgeSeen.mockResolvedValue();
    renderInlineBadgeResult.mockReset();
    renderInlineBadgeResult.mockResolvedValue({ svg: '<svg/>' });
  });

  it('reports a drawn badge after the response, with the login as requested', async () => {
    const response = await get(PROXY);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<svg/>');
    expect(reportBadgeSeen).not.toHaveBeenCalled();
    await runAfter();
    expect(reportBadgeSeen).toHaveBeenCalledExactlyOnceWith('user', 'OctoCat');
  });

  it('still draws the error image of an unknown login, and reports nothing for it', async () => {
    renderInlineBadgeResult.mockResolvedValue({ svg: '<svg>ERROR</svg>', error: 'User not found' });
    const response = await get(PROXY, 'nobody');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<svg>ERROR</svg>');
    expect(after).not.toHaveBeenCalled();
  });

  it('schedules nothing for a browser or a bad query', async () => {
    expect((await get(BROWSER)).status).toBe(200);
    expect((await get(PROXY, 'octocat', '?type=nope')).status).toBe(400);

    expect(after).not.toHaveBeenCalled();
  });
});
