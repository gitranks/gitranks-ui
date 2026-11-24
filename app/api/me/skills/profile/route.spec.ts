import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { learnerNumbers } from '@/lib/skills/__fixtures__/skills';
import type { SkillsOverviewMine } from '@/lib/skills/skills-overview';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';

const { loadSkillsOverview, loadLearnQueueTop, current } = vi.hoisted(() => ({
  loadSkillsOverview: vi.fn(),
  loadLearnQueueTop: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/skills/skills-overview.data', () => ({ loadSkillsOverview }));
vi.mock('@/lib/learn/learn-queue-top.data', () => ({ loadLearnQueueTop }));

const route = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };

const NONE = { sides: null, block: null, learnRows: null };
const get = (login = 'octocat') =>
  route.GET(new NextRequest(`https://gitranks.com/api/me/skills/profile?login=${encodeURIComponent(login)}`));
const signIn = () => {
  current.session = { user: { githubLogin: 'OctoCat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};
const mine = (patch: Partial<SkillsOverviewMine>): SkillsOverviewMine => ({
  state: 'PUBLIC',
  page: { login: 'octocat', numbers: learnerNumbers },
  usesContribute: false,
  usesLearn: true,
  ...patch,
});
const rows = [{ kind: 'masked' as const, masked: maskedIssue() }];

beforeEach(() => {
  loadSkillsOverview.mockReset();
  loadLearnQueueTop.mockReset();
  current.session = null;
});

describe("the route for what the owner's profile overview shows them of Skills", () => {
  it('answers nothing signed out and on anyone else’s profile, without asking the API, never kept', async () => {
    const out = await get();
    expect(await out.json()).toEqual(NONE);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    signIn();
    expect(await (await get('someone')).json()).toEqual(NONE);
    expect(loadSkillsOverview).not.toHaveBeenCalled();
  });

  it('answers nothing when the view cannot be read', async () => {
    signIn();
    loadSkillsOverview.mockResolvedValueOnce(null);
    expect(await (await get()).json()).toEqual(NONE);
    expect(loadSkillsOverview).toHaveBeenCalledWith('OctoCat');
  });

  it('gives a learner the top of their own list, and their block while their page is hidden', async () => {
    signIn();
    loadSkillsOverview.mockResolvedValueOnce(mine({ state: 'HIDDEN' }));
    loadLearnQueueTop.mockResolvedValueOnce(rows);
    expect(await (await get(' octocat ')).json()).toEqual({
      sides: { usesContribute: false, usesLearn: true },
      block: { numbers: learnerNumbers, state: 'HIDDEN' },
      learnRows: rows,
    });
    expect(loadLearnQueueTop).toHaveBeenCalledWith('OctoCat');
  });

  it('asks no Learn list for someone who contributes or uses neither; no block on a public page', async () => {
    signIn();
    for (const view of [mine({ usesContribute: true }), mine({ usesLearn: false, state: 'NEW', page: null })]) {
      loadSkillsOverview.mockResolvedValueOnce(view);
      const answer = await (await get()).json();
      expect(answer.learnRows).toBeNull();
      expect(answer.block).toBeNull();
    }
    expect(loadLearnQueueTop).not.toHaveBeenCalled();
  });
});
