import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadSkillsLogins, cacheLife } = vi.hoisted(() => ({ loadSkillsLogins: vi.fn(), cacheLife: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsLogins }));

const { default: sitemap } = await import('./sitemap');

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
});

describe('the Skills sitemap', () => {
  it('lists the pages the API lists, kept for hours', async () => {
    loadSkillsLogins.mockResolvedValueOnce(['octocat']);
    expect((await sitemap()).map((entry) => entry.url)).toEqual(['https://gitranks.com/profile/octocat/skills']);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('hours');
  });

  it('is empty, for minutes only, while there is none or the read failed', async () => {
    for (const logins of [[], null]) {
      cacheLife.mockReset();
      loadSkillsLogins.mockResolvedValueOnce(logins);
      expect(await sitemap()).toEqual([]);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
    }
  });
});
