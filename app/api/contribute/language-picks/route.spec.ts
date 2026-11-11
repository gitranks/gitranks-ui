import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLanguagePicks } = vi.hoisted(() => ({ loadLanguagePicks: vi.fn() }));
vi.mock('@/lib/contribute/profile-picks.data', () => ({ loadLanguagePicks }));

const { GET } = await import('./route');

const get = (language?: string) =>
  GET(new NextRequest(`https://gitranks.com/api/contribute/language-picks${language ? `?language=${language}` : ''}`));

describe("a visitor's language picks route", () => {
  beforeEach(() => loadLanguagePicks.mockReset());

  it("answers a pool language's picks, the same for everyone, cacheable", async () => {
    loadLanguagePicks.mockResolvedValueOnce({ issues: [{ repo: 'o/r' }], stats: null });
    const response = await get('GO');
    expect(await response.json()).toEqual({ issues: [{ repo: 'o/r' }], stats: null });
    expect(loadLanguagePicks).toHaveBeenCalledWith('GO');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
  });

  it.each([undefined, 'go', 'COBOL'])('answers nothing for %s, without asking', async (language) => {
    expect(await (await get(language)).json()).toEqual({ issues: [], stats: null });
    expect(loadLanguagePicks).not.toHaveBeenCalled();
  });
});
