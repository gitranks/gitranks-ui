import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { LearnPromoDocument, LearnPromoMaskedDocument } = await import('@/lib/learn/learn.documents');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

const get = (query: string) => GET(new NextRequest(`https://gitranks.com/api/me/learn/promo?${query}`));

const signIn = (githubLogin: string) => {
  current.session = { user: { githubLogin }, expires: '2099-01-01T00:00:00.000Z' };
};

const PROMO = { show: true, reason: 'Why.', language: 'Go', issues: [] };

describe("the route for the viewer's Learn suggestion", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers none to a visitor, another login, or an unknown placement, without asking the API', async () => {
    expect(await (await get('placement=landing&login=octocat')).json()).toEqual({ promo: null });
    signIn('octocat');
    expect(await (await get('placement=profile&login=someone')).json()).toEqual({ promo: null });
    expect(await (await get('placement=landing&login=someone')).json()).toEqual({ promo: null });
    const response = await get('placement=sidebar&login=octocat');
    expect(await response.json()).toEqual({ promo: null });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('asks as the viewer, with their own login on the profile and none on the home page', async () => {
    signIn('OctoCat');
    graphqlDirect.mockResolvedValue({ learnOpen: true, learnPromo: PROMO });
    expect(await (await get('placement=profile&login=octocat')).json()).toEqual({
      promo: { reason: 'Why.', language: 'Go', issues: [] },
    });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      LearnPromoMaskedDocument,
      { placement: 'PROFILE', login: 'OctoCat' },
      { source: 'client', githubLogin: 'OctoCat' },
    );
    await get('placement=landing&login=octocat');
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      LearnPromoMaskedDocument,
      { placement: 'LANDING', login: null },
      { source: 'client', githubLogin: 'OctoCat' },
    );
  });

  it('answers none when Learn is not open to the viewer, or the API says not to show it', async () => {
    signIn('octocat');
    graphqlDirect.mockResolvedValueOnce({ learnOpen: false, learnPromo: PROMO });
    expect(await (await get('placement=landing&login=octocat')).json()).toEqual({ promo: null });
    graphqlDirect.mockResolvedValueOnce({ learnOpen: true, learnPromo: { ...PROMO, show: false } });
    expect(await (await get('placement=landing&login=octocat')).json()).toEqual({ promo: null });
  });

  it('answers none, never an error, when the API does not know the fields yet', async () => {
    signIn('octocat');
    graphqlDirect.mockRejectedValueOnce({
      response: { errors: [{ message: 'Cannot query field "learnPromo" on type "Query".' }] },
    });
    const response = await get('placement=landing&login=octocat');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ promo: null });
  });

  it("answers the masked issues, and today's from an API that does not know them", async () => {
    signIn('octocat');
    const masked = maskedIssue();
    const issue = { title: null, repo: null, number: null, language: 'Go', topic: 'maps', masked };
    graphqlDirect.mockResolvedValueOnce({ learnOpen: true, learnPromo: { ...PROMO, issues: [issue] } });
    expect(await (await get('placement=profile&login=octocat')).json()).toEqual({
      promo: {
        reason: 'Why.',
        language: 'Go',
        issues: [{ title: masked.title, repo: '', number: 0, language: 'Go', topic: 'maps', masked }],
      },
    });

    graphqlDirect.mockReset();
    const today = { title: 'Fix it', repo: 'o/r', number: 7, language: 'Go', topic: 'maps' };
    graphqlDirect.mockImplementation(async (document) => {
      if (document === LearnPromoMaskedDocument) {
        throw new Error('[{"message":"Cannot query field \\"masked\\" on type \\"LearnPromoIssue\\"."}]');
      }
      return { learnOpen: true, learnPromo: { ...PROMO, issues: [today] } };
    });
    expect(await (await get('placement=profile&login=octocat')).json()).toEqual({
      promo: { reason: 'Why.', language: 'Go', issues: [today] },
    });
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([
      LearnPromoMaskedDocument,
      LearnPromoDocument,
    ]);
  });

  it('answers none on an outage, asked once', async () => {
    signIn('octocat');
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await (await get('placement=profile&login=octocat')).json()).toEqual({ promo: null });
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });
});
