import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadIssuesList, loadMaskedListReads, loadLearnSign, loadContributeSetupState, current } = vi.hoisted(() => ({
  loadIssuesList: vi.fn(),
  loadContributeSetupState: vi.fn(),
  loadMaskedListReads: vi.fn(),
  loadLearnSign: vi.fn(),
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
vi.mock('@/lib/learn/learn-sign.data', () => ({ loadLearnSign }));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContributeSetupState }));

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
    loadLearnSign.mockReset().mockResolvedValue(true);
    loadContributeSetupState.mockReset().mockResolvedValue('none');
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
      show: 'fixed',
    });
    // Not a view of one lesson: the Learn sign is not read.
    expect(loadLearnSign).not.toHaveBeenCalled();
  });

  it('answers the Learn sign beside the list on a view of one lesson, null when it cannot be read', async () => {
    signIn();
    loadIssuesList.mockResolvedValue({ kind: 'ok', data: personalList() });
    for (const sign of [true, false, null]) {
      loadLearnSign.mockResolvedValueOnce(sign);
      const res = await get('?lesson=find-duplicates-with-a-set&at=lesson');
      expect(await res.json()).toEqual({ state: 'ok', list: personalList(), reads, learnOnboarded: sign });
    }
    expect(loadLearnSign).toHaveBeenCalledWith('octocat');
  });

  it('answers unavailable or failed as the read does', async () => {
    signIn();
    for (const kind of ['unavailable', 'failed']) {
      loadIssuesList.mockResolvedValueOnce({ kind });
      expect(await (await get()).json()).toEqual({ state: kind });
    }
  });

  it('answers managed for a company-managed account with no list', async () => {
    signIn();
    loadContributeSetupState.mockResolvedValue('managed');
    loadIssuesList.mockResolvedValueOnce({ kind: 'unavailable' });
    expect(await (await get()).json()).toEqual({ state: 'managed' });
    loadIssuesList.mockResolvedValueOnce({ kind: 'failed' });
    expect(await (await get()).json()).toEqual({ state: 'failed' });
  });
});
