import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
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
vi.mock('server-only', () => ({}));

type Route = (req: NextRequest, ctx?: unknown) => Promise<Response>;
const { GET: planMine } = (await import('./plans/[company]/[plan]/route')) as unknown as { GET: Route };
const { POST: start } = (await import('./start/route')) as unknown as { POST: Route };
const { POST: stop } = (await import('./stop/route')) as unknown as { POST: Route };
const { seniorInProgress, seniorStopped } = await import('@/lib/interviews/__fixtures__/mine');

const URL_BASE = 'https://gitranks.com';
const PLAN = { company: 'northwind', plan: 'senior-software-engineer' };
const signedIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};
const read = () =>
  planMine(new NextRequest(`${URL_BASE}/api/me/interviews/plans/northwind/senior-software-engineer`), {
    params: Promise.resolve(PLAN),
  });
const post = (path: string, body: unknown, type = 'application/json') =>
  new NextRequest(`${URL_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  graphqlDirect.mockReset();
  current.session = null;
});

describe('/api/me/interviews/plans/<company>/<plan>', () => {
  it('is null signed out, without asking the API, and never kept', async () => {
    const response = await read();
    expect(await response.json()).toEqual({ mine: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("is the person's plan, and null on a failure", async () => {
    signedIn();
    graphqlDirect.mockResolvedValueOnce({ interviewPlanMine: seniorInProgress });
    expect(await (await read()).json()).toEqual({ mine: seniorInProgress });
    expect(graphqlDirect.mock.calls[0][1]).toEqual(PLAN);
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ githubLogin: 'octocat' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await read()).json()).toEqual({ mine: null });
  });
});

describe('/api/me/interviews/start and /stop', () => {
  it('refuse signed out with 401, without asking the API', async () => {
    for (const [route, path] of [
      [start, '/api/me/interviews/start'],
      [stop, '/api/me/interviews/stop'],
    ] as const) {
      const response = await route(post(path, PLAN));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false, error: 'SIGNED_OUT' });
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('take JSON only, so no other page can post them', async () => {
    signedIn();
    const response = await start(
      post('/api/me/interviews/start', 'company=northwind', 'application/x-www-form-urlencoded'),
    );
    expect(response.status).toBe(400);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('start the plan and stop it with a reason, answering the plan for the person', async () => {
    signedIn();
    graphqlDirect.mockResolvedValueOnce({ startInterviewPlan: seniorInProgress });
    const started = await start(post('/api/me/interviews/start', PLAN));
    expect(started.status).toBe(200);
    expect(await started.json()).toEqual({ ok: true, data: seniorInProgress });

    graphqlDirect.mockResolvedValueOnce({ stopInterviewPlan: seniorStopped });
    const stopped = await stop(post('/api/me/interviews/stop', { ...PLAN, reason: 'only_looking' }));
    expect(await stopped.json()).toEqual({ ok: true, data: seniorStopped });
    expect(graphqlDirect.mock.calls[1][1]).toEqual({ ...PLAN, reason: 'only_looking' });
  });

  it('answer a refusal with its status', async () => {
    signedIn();
    graphqlDirect.mockRejectedValueOnce(new Error(JSON.stringify([{ extensions: { code: 'NOT_FOUND' } }])));
    expect((await start(post('/api/me/interviews/start', PLAN))).status).toBe(404);
    expect((await stop(post('/api/me/interviews/stop', { ...PLAN, reason: 'bored' }))).status).toBe(400);
  });
});
