import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadIssuesList, loadMaskedListReads, current } = vi.hoisted(() => ({
  loadIssuesList: vi.fn(),
  loadMaskedListReads: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/learn/issues.data', () => ({ loadIssuesList }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadMaskedListReads }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { personalList } = await import('@/lib/learn/__fixtures__/issues');
const { ISSUES_VIEW } = await import('@/lib/learn/issues');

const get = (query = '') => GET(new NextRequest(`https://gitranks.com/api/me/learn/issues${query}`));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};
const reads = { looks: null, numbers: { read: 3, kept: 1 } };

describe("the person's Issues route", () => {
  beforeEach(() => {
    loadIssuesList.mockReset();
    loadMaskedListReads.mockReset().mockResolvedValue(reads);
    current.session = null;
  });

  it('answers signed out without asking, never kept', async () => {
    for (const session of [() => {}, () => signIn('RefreshTokenError')]) {
      current.session = null;
      session();
      const res = await get();
      expect(await res.json()).toEqual({ state: 'signed-out' });
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadIssuesList).not.toHaveBeenCalled();
  });

  it("answers the person's five for the view in the query, with the masked list's reads, never kept", async () => {
    signIn();
    loadIssuesList.mockResolvedValue({ kind: 'ok', data: personalList() });
    const res = await get('?course=algorithms&for-you=0&learned=1&fixed=1');
    expect(await res.json()).toEqual({ state: 'ok', list: personalList(), reads });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadIssuesList).toHaveBeenCalledWith('octocat', {
      ...ISSUES_VIEW,
      course: 'algorithms',
      forYou: false,
      learned: true,
      fixed: true,
    });
  });

  it('answers unavailable or failed as the read does', async () => {
    signIn();
    for (const kind of ['unavailable', 'failed']) {
      loadIssuesList.mockResolvedValueOnce({ kind });
      expect(await (await get()).json()).toEqual({ state: kind });
    }
  });
});
