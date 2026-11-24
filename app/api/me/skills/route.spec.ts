import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { skillsMine } from '@/lib/skills/__fixtures__/skills';

const { loadSkillsMine, loadSkillsTab, markSkillsSeen, current } = vi.hoisted(() => ({
  loadSkillsMine: vi.fn(),
  loadSkillsTab: vi.fn(),
  markSkillsSeen: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsMine, loadSkillsTab, markSkillsSeen }));

type Route = (req: NextRequest) => Promise<Response>;
const mineRoute = (await import('./route')) as unknown as { GET: Route };
const tabRoute = (await import('./tab/route')) as unknown as { GET: Route };
const seenRoute = (await import('./seen/route')) as unknown as { POST: Route };

const request = (path: string, cookie?: string, method = 'GET') =>
  new NextRequest(`https://gitranks.com/api/me/skills${path}`, {
    method,
    headers: cookie ? { cookie } : undefined,
  });
const signIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};

beforeEach(() => {
  loadSkillsMine.mockReset();
  loadSkillsTab.mockReset();
  markSkillsSeen.mockReset();
  current.session = null;
});

describe("the route for the signed-in person's own Skills page", () => {
  it('says signed out without asking the API, never kept', async () => {
    const response = await mineRoute.GET(request(''));
    expect(await response.json()).toEqual({ mine: null, signedOut: true });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(loadSkillsMine).not.toHaveBeenCalled();
  });

  it("answers the person's view, its New mark gone once this browser opened the tab", async () => {
    signIn();
    loadSkillsMine.mockResolvedValue(skillsMine.new);
    expect(await (await mineRoute.GET(request(''))).json()).toEqual({ mine: skillsMine.new, signedOut: false });
    expect(loadSkillsMine).toHaveBeenCalledWith('octocat');
    const seen = await (await mineRoute.GET(request('', 'skills_seen=1'))).json();
    expect(seen.mine.tabNew).toBe(false);
  });

  it('answers none, still signed in, when the view cannot be read', async () => {
    signIn();
    loadSkillsMine.mockResolvedValueOnce(undefined);
    expect(await (await mineRoute.GET(request(''))).json()).toEqual({ mine: null, signedOut: false });
  });
});

describe("the route for the Skills tab's New mark", () => {
  it('is false signed out, without asking the API, and on a failed read', async () => {
    expect(await (await tabRoute.GET(request('/tab'))).json()).toEqual({ tabNew: false });
    expect(loadSkillsTab).not.toHaveBeenCalled();
    signIn();
    loadSkillsTab.mockResolvedValueOnce(null);
    const failed = await tabRoute.GET(request('/tab'));
    expect(await failed.json()).toEqual({ tabNew: false });
    expect(failed.headers.get('cache-control')).toBe('private, no-store');
  });

  it("holds the API's mark until this browser opened the tab", async () => {
    signIn();
    loadSkillsTab.mockResolvedValue({ state: 'NEW', tabNew: true });
    expect(await (await tabRoute.GET(request('/tab'))).json()).toEqual({ tabNew: true });
    expect(await (await tabRoute.GET(request('/tab', 'skills_seen=1'))).json()).toEqual({ tabNew: false });
  });
});

describe('the route that marks the Skills tab opened', () => {
  it('refuses without a session, asking nothing and setting no cookie', async () => {
    const response = await seenRoute.POST(request('/seen', undefined, 'POST'));
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(markSkillsSeen).not.toHaveBeenCalled();
  });

  it('marks it with the API and in a cookie a script cannot read, kept a year', async () => {
    signIn();
    markSkillsSeen.mockResolvedValueOnce(true);
    const response = await seenRoute.POST(request('/seen', undefined, 'POST'));
    expect(await response.json()).toEqual({ marked: true });
    expect(markSkillsSeen).toHaveBeenCalledWith('octocat');
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^skills_seen=1;/);
    expect(cookie).toMatch(/Max-Age=31536000/i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it('still sets the cookie when the API cannot keep the mark', async () => {
    signIn();
    markSkillsSeen.mockResolvedValueOnce(false);
    const response = await seenRoute.POST(request('/seen', undefined, 'POST'));
    expect(await response.json()).toEqual({ marked: false });
    expect(response.headers.get('set-cookie')).toMatch(/^skills_seen=1;/);
  });
});
