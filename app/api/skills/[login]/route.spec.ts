import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contributorNumbers } from '@/lib/skills/__fixtures__/skills';

const { loadSkillsBrief, loadSkillsFixes } = vi.hoisted(() => ({
  loadSkillsBrief: vi.fn(),
  loadSkillsFixes: vi.fn(),
}));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsBrief, loadSkillsFixes }));
const everyone = vi.hoisted(() => ({ open: true }));
vi.mock('@/app/components/landing/landing-data', () => ({ fetchLearnForVisitors: async () => everyone.open }));

const brief = await import('./route');
const fixes = await import('./fixes/route');

const getBrief = (login: string) =>
  brief.GET(new Request(`https://gitranks.com/api/skills/${login}`), { params: Promise.resolve({ login }) });
const getFixes = (login: string, after: string | null) =>
  fixes.GET(new Request(`https://gitranks.com/api/skills/${login}/fixes${after === null ? '' : `?after=${after}`}`), {
    params: Promise.resolve({ login }),
  });

const BRIEF = { login: 'octocat', numbers: contributorNumbers };

beforeEach(() => {
  loadSkillsBrief.mockReset();
  loadSkillsFixes.mockReset();
  everyone.open = true;
});

describe("the route for a login's Skills numbers", () => {
  it('answers the same for everyone, kept a minute, with whether Learn is open to everyone', async () => {
    loadSkillsBrief.mockResolvedValueOnce({ value: BRIEF, failed: false });
    const response = await getBrief('octocat');
    expect(await response.json()).toEqual({ brief: BRIEF, learnOpen: true });
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(loadSkillsBrief).toHaveBeenCalledWith('octocat');
  });

  it('answers none without a public page, and for what is not a login without asking', async () => {
    everyone.open = false;
    loadSkillsBrief.mockResolvedValueOnce({ value: null, failed: false });
    expect(await (await getBrief('octocat')).json()).toEqual({ brief: null, learnOpen: false });
    expect(await (await getBrief('a.b')).json()).toEqual({ brief: null, learnOpen: false });
    expect(loadSkillsBrief).toHaveBeenCalledOnce();
  });

  it('answers none on a failed read, never kept', async () => {
    loadSkillsBrief.mockResolvedValueOnce({ value: null, failed: true });
    const response = await getBrief('octocat');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ brief: null, learnOpen: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

describe('the route for the next fixes of a Skills page', () => {
  it('reads the fixes after the cursor, kept a minute', async () => {
    const answer = { rows: [], total: 26, next: 'c26' };
    loadSkillsFixes.mockResolvedValueOnce({ value: answer, failed: false });
    const response = await getFixes('octocat', 'c6');
    expect(await response.json()).toEqual({ fixes: answer });
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(loadSkillsFixes).toHaveBeenCalledWith('octocat', 'c6');
  });

  it('answers none, never kept, without a cursor, for one that cannot be one, for what is not a login, or on a failure', async () => {
    for (const response of [
      await getFixes('octocat', null),
      await getFixes('octocat', 'a%20b'),
      await getFixes('a.b', 'c6'),
    ]) {
      expect(await response.json()).toEqual({ fixes: null });
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(loadSkillsFixes).not.toHaveBeenCalled();
    loadSkillsFixes.mockResolvedValueOnce({ value: null, failed: true });
    const failed = await getFixes('octocat', 'c6');
    expect(await failed.json()).toEqual({ fixes: null });
    expect(failed.headers.get('cache-control')).toBe('no-store');
  });
});
