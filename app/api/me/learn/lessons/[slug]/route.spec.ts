import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Context = { params: Promise<{ slug: string }> };
type Handler = (req: NextRequest & { auth: Session | null }, context: Context) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, context: Context) => {
    req.auth = current.session;
    return handler(req, context);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: Context) => Promise<Response>;
};
const { LearnLessonMineDocument } = await import('@/lib/learn/lesson-page.documents');
const { LearnSetupMainLanguageDocument } = await import('@/lib/learn/review.documents');
const { ContributeSignsDocument } = await import('@/lib/workspace/contribute.documents');

/** The API's answers, by document: the lesson's side, the setup's main language, and the two signs. */
const answers = (mine: unknown, setup: unknown, signs: unknown = null) =>
  graphqlDirect.mockImplementation(async (document: unknown) => {
    const answer =
      document === LearnLessonMineDocument
        ? mine
        : document === LearnSetupMainLanguageDocument
          ? setup
          : document === ContributeSignsDocument
            ? signs
            : null;
    if (answer instanceof Error) throw answer;
    return answer;
  });

const get = (slug: string, query = '') =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/lessons/${slug}${query}`), {
    params: Promise.resolve({ slug }),
  });
/** As the lesson's page asks it: with the person's main language. */
const getWithMain = (slug: string) => get(slug, '?main=1');
const read = {
  depth: 'LEARNED',
  known: false,
  learnedAt: '2026-11-14T09:30:00.000Z',
  dueAt: null,
  picked: 1,
  language: 'python',
  tries: 1,
  feedbackGood: null,
};

describe("a lesson's personal side", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking the API, and is never kept', async () => {
    const res = await get('sets');
    expect(await res.json()).toEqual({ mine: null, mainLanguage: null, learnOnboarded: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's side, as that person, with the language of the last answer and their main language", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    answers({ learnLessonMine: read }, { learnSetupOfMine: { mainLanguage: 'javascript' } });
    const res = await getWithMain('sets');
    expect(await res.json()).toEqual({ mine: read, mainLanguage: 'javascript', learnOnboarded: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnLessonMineDocument,
      { slug: 'sets' },
      { source: 'ssr', githubLogin: 'octocat' },
    );
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnSetupMainLanguageDocument,
      {},
      { source: 'ssr', githubLogin: 'octocat' },
    );
  });

  it('answers the side without a main language when the setup has none or its read fails', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    answers({ learnLessonMine: read }, { learnSetupOfMine: null });
    expect(await (await getWithMain('sets')).json()).toEqual({ mine: read, mainLanguage: null, learnOnboarded: null });
    answers({ learnLessonMine: read }, new Error('down'));
    expect(await (await getWithMain('sets')).json()).toEqual({ mine: read, mainLanguage: null, learnOnboarded: null });
  });

  it('reads the main language only when the page asks for it, and only when the side came', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    answers({ learnLessonMine: read }, { learnSetupOfMine: { mainLanguage: 'go' } });
    expect(await (await get('sets')).json()).toEqual({ mine: read, mainLanguage: null, learnOnboarded: null });
    for (const mine of [{ learnLessonMine: null }, new Error('down')]) {
      answers(mine, { learnSetupOfMine: { mainLanguage: 'go' } });
      expect(await (await getWithMain('sets')).json()).toEqual({
        mine: null,
        mainLanguage: null,
        learnOnboarded: null,
      });
    }
    expect(graphqlDirect).not.toHaveBeenCalledWith(
      LearnSetupMainLanguageDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('answers nothing when Learn is not open to them, on a failure, and for a slug of no shape', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    answers({ learnLessonMine: null }, { learnSetupOfMine: null });
    expect(await (await get('sets')).json()).toEqual({ mine: null, mainLanguage: null, learnOnboarded: null });
    answers(new Error('down'), new Error('down'));
    expect(await (await get('sets')).json()).toEqual({ mine: null, mainLanguage: null, learnOnboarded: null });
    graphqlDirect.mockClear();
    answers({ learnLessonMine: null }, { learnSetupOfMine: null });
    expect(await (await get('_gone')).json()).toEqual({ mine: null, mainLanguage: null, learnOnboarded: null });
    expect(graphqlDirect).not.toHaveBeenCalledWith(LearnLessonMineDocument, expect.anything(), expect.anything());
  });

  it('answers the Learn sign beside the side, and not known when it cannot be read', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    const signs = (learnOnboardedAt: string | null) => ({
      contribute: { contributor: { contributeOnboardedAt: null, learnOnboardedAt } },
    });
    answers({ learnLessonMine: read }, null, signs('2026-11-25T10:00:00.000Z'));
    expect(await (await get('sets')).json()).toMatchObject({ mine: read, learnOnboarded: true });
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeSignsDocument, undefined, {
      source: 'ssr',
      githubLogin: 'octocat',
    });
    answers({ learnLessonMine: read }, null, signs(null));
    expect(await (await get('sets')).json()).toMatchObject({ mine: read, learnOnboarded: false });
    answers({ learnLessonMine: read }, null, new Error('down'));
    expect(await (await get('sets')).json()).toMatchObject({ mine: read, learnOnboarded: null });
    answers({ learnLessonMine: read }, null, { contribute: null });
    expect(await (await get('sets')).json()).toMatchObject({ mine: read, learnOnboarded: null });
  });

  it('treats a session the server could not read as signed out', async () => {
    current.session = {
      user: { githubLogin: 'octocat' },
      expires: '2099-01-01T00:00:00.000Z',
      error: 'RefreshFailed',
    } as unknown as Session;
    expect(await (await get('sets')).json()).toEqual({ mine: null, mainLanguage: null, learnOnboarded: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
