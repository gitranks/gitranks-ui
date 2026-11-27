import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, loadInterviewPlan, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  loadInterviewPlan: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }, ctx: unknown) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, ctx: unknown) => {
    req.auth = current.session;
    return handler(req, ctx);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
// The plan's public read is kept for everyone; here it is the made-up plan.
vi.mock('@/lib/interviews/plan.data', () => ({ loadInterviewPlan }));
vi.mock('server-only', () => ({}));

type Route = (req: NextRequest, ctx?: unknown) => Promise<Response>;
const { GET: lessonMine } = (await import('./lesson/route')) as unknown as { GET: Route };
const { GET: nextMine } = (await import('./next/[company]/[plan]/route')) as unknown as { GET: Route };
const { InterviewNextDocument, InterviewPlanMineDocument } = await import('@/lib/interviews/mine.documents');
const { LessonHeldDocument } = await import('@/lib/interviews/lesson-in-plan.data');
const { graphsInPlan } = await import('@/lib/interviews/__fixtures__/lesson-in-plan');
const { nextAfterPart, seniorInProgress, seniorStopped } = await import('@/lib/interviews/__fixtures__/mine');
const { northwindSeniorPlan } = await import('@/lib/interviews/__fixtures__/plans');

const URL_BASE = 'https://gitranks.com';
const PLAN = { company: 'northwind', plan: 'senior-software-engineer' };
const LESSON = 'lesson=graphs-4&course=algorithms&group=graphs';
const signedIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};
const readLesson = (query = `company=northwind&plan=senior-software-engineer&${LESSON}`) =>
  lessonMine(new NextRequest(`${URL_BASE}/api/me/interviews/lesson?${query}`));
const readNext = (after = 'algorithms%2Fgraphs') =>
  nextMine(new NextRequest(`${URL_BASE}/api/me/interviews/next/northwind/senior-software-engineer?after=${after}`), {
    params: Promise.resolve(PLAN),
  });

/** The API's answers: the person's plan, and whether the lesson is held. */
function api({ mine = seniorInProgress as unknown, held = false } = {}) {
  graphqlDirect.mockImplementation(async (document: unknown) => {
    if (document === InterviewPlanMineDocument) return { interviewPlanMine: mine };
    if (document === LessonHeldDocument) return { learnLessonMine: { held } };
    if (document === InterviewNextDocument) return { interviewNext: nextAfterPart };
    throw new Error('not asked here');
  });
}

beforeEach(() => {
  graphqlDirect.mockReset();
  loadInterviewPlan.mockReset();
  loadInterviewPlan.mockResolvedValue(northwindSeniorPlan);
  current.session = null;
});

describe('/api/me/interviews/lesson', () => {
  it('is null signed out and for a query not of slugs, without asking the API, and never kept', async () => {
    const response = await readLesson();
    expect(await response.json()).toEqual({ lesson: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    signedIn();
    for (const query of [
      LESSON,
      `company=northwind&plan=Senior&${LESSON}`,
      'company=northwind&plan=senior-software-engineer&lesson=graphs-4&course=algorithms',
      'company=northwind&plan=senior-software-engineer&lesson=..%2Fx&course=algorithms&group=graphs',
    ]) {
      expect(await (await readLesson(query)).json()).toEqual({ lesson: null });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(loadInterviewPlan).not.toHaveBeenCalled();
  });

  it("is the lesson's place in the person's plan, and whether it is held, as that person", async () => {
    signedIn();
    api();
    expect(await (await readLesson()).json()).toEqual({ lesson: graphsInPlan });
    for (const [, variables, options] of graphqlDirect.mock.calls) {
      expect(options).toMatchObject({ githubLogin: 'octocat' });
      expect(variables).toEqual(expect.objectContaining(variables.slug ? { slug: 'graphs-4' } : PLAN));
    }
    api({ held: true });
    expect(await (await readLesson()).json()).toMatchObject({ lesson: { held: true } });
  });

  it('is null when the plan is not in progress or not read, and keeps the place when only the held read fails', async () => {
    signedIn();
    api({ mine: seniorStopped });
    expect(await (await readLesson()).json()).toEqual({ lesson: null });
    loadInterviewPlan.mockResolvedValueOnce(null);
    api();
    expect(await (await readLesson()).json()).toEqual({ lesson: null });
    graphqlDirect.mockImplementation(async (document: unknown) => {
      if (document === LessonHeldDocument) throw new Error('down');
      return { interviewPlanMine: seniorInProgress };
    });
    expect(await (await readLesson()).json()).toEqual({ lesson: graphsInPlan });
  });
});

describe('/api/me/interviews/next/<company>/<plan>', () => {
  it('is null signed out and after a key not of its shape, without asking the API, and never kept', async () => {
    const response = await readNext();
    expect(await response.json()).toEqual({ next: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    signedIn();
    for (const after of ['', 'graphs', 'algorithms%2Fgraphs%2Fmore', 'Algorithms%2Fgraphs']) {
      expect(await (await readNext(after)).json()).toEqual({ next: null });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('is what was done and the plan now, as that person, and null on a failure', async () => {
    signedIn();
    api();
    expect(await (await readNext()).json()).toEqual({ next: nextAfterPart });
    expect(graphqlDirect).toHaveBeenCalledWith(
      InterviewNextDocument,
      { ...PLAN, after: 'algorithms/graphs' },
      expect.objectContaining({ githubLogin: 'octocat' }),
    );
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await readNext()).json()).toEqual({ next: null });
  });
});
