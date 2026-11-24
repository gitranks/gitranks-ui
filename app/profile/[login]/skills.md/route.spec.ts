import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bothPage } from '@/lib/skills/__fixtures__/skills';

const { loadSkillsPage, connection } = vi.hoisted(() => ({
  loadSkillsPage: vi.fn(),
  connection: vi.fn(async () => undefined),
}));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<object>()), connection }));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsPage }));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const { GET } = await import('./route');

const get = (login: string) =>
  GET(new Request(`https://gitranks.com/profile/${login}/skills.md`), { params: Promise.resolve({ login }) });

beforeEach(() => {
  loadSkillsPage.mockReset();
  connection.mockClear();
});

describe("a Skills page's Markdown route", () => {
  it('answers the copy, kept a minute, not indexed, pointing at the page', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: bothPage, failed: false });
    const response = await get('octocat');
    expect(connection).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('link')).toBe('</profile/octocat/skills>; rel="canonical"');
    const text = await response.text();
    expect(text).toMatch(/^# octocat’s skills/);
    expect(text).toContain('## Courses');
  });

  it('is not found, never kept, where there is no page, and for what is not a login without asking', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: false });
    for (const response of [await get('octocat'), await get('a.b')]) {
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadSkillsPage).toHaveBeenCalledOnce();
  });

  it('says a failed read is for a minute', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: true });
    const response = await get('octocat');
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
