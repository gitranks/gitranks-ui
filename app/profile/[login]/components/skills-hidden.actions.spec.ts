import { beforeEach, describe, expect, it, vi } from 'vitest';

import { skillsMine } from '@/lib/skills/__fixtures__/skills';

const { setSkillsHidden, revalidateTag, viewer } = vi.hoisted(() => ({
  setSkillsHidden: vi.fn(),
  revalidateTag: vi.fn(),
  viewer: { login: null as string | null },
}));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('@/lib/skills/skills.data', () => ({ setSkillsHidden }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin: async () => viewer.login }));

const { setSkillsHiddenAction } = await import('./skills-hidden.actions');

beforeEach(() => {
  setSkillsHidden.mockReset();
  revalidateTag.mockReset();
  viewer.login = 'OctoCat';
});

describe('hiding or showing the Skills page', () => {
  it("sets the session's own page, then expires what is kept under its tag at once", async () => {
    setSkillsHidden.mockResolvedValueOnce(skillsMine.hiddenLearner);
    await expect(setSkillsHiddenAction(true)).resolves.toEqual({ ok: true, mine: skillsMine.hiddenLearner });
    expect(setSkillsHidden).toHaveBeenCalledWith('OctoCat', true);
    expect(revalidateTag).toHaveBeenCalledWith('skills:octocat', { expire: 0 });
  });

  it('says signed out without a session, asking nothing', async () => {
    viewer.login = null;
    await expect(setSkillsHiddenAction(false)).resolves.toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(setSkillsHidden).not.toHaveBeenCalled();
  });

  it('says it failed, expiring nothing, when the API fails or the choice is not one', async () => {
    setSkillsHidden.mockRejectedValueOnce(new Error('down'));
    await expect(setSkillsHiddenAction(false)).resolves.toEqual({ ok: false, error: 'FAILED' });
    await expect(setSkillsHiddenAction('yes' as unknown as boolean)).resolves.toEqual({ ok: false, error: 'FAILED' });
    expect(setSkillsHidden).toHaveBeenCalledOnce();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
