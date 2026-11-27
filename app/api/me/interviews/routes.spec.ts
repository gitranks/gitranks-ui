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
const { GET: open } = (await import('./open/route')) as unknown as { GET: Route };
const { GET: bar } = (await import('./bar/route')) as unknown as { GET: Route };
const { POST: report } = (await import('./report/route')) as unknown as { POST: Route };
const { InterviewsOpenDocument } = await import('@/lib/interviews/interviews.documents');

const URL_BASE = 'https://gitranks.com';
const signedIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};
const get = (path: string) => new NextRequest(`${URL_BASE}${path}`);
const post = (body: unknown, type = 'application/json') =>
  new NextRequest(`${URL_BASE}/api/me/interviews/report`, {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const reportBody = { company: 'northwind', plan: 'senior-software-engineer', fact: 'rounds/3', note: 'Four rounds.' };

beforeEach(() => {
  graphqlDirect.mockReset();
  current.session = null;
});

describe('/api/me/interviews/open', () => {
  it('is closed signed out without asking the API, and never kept', async () => {
    const response = await open(get('/api/me/interviews/open'));
    expect(await response.json()).toEqual({ open: false });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("is the API's answer for the person, and closed on a failure", async () => {
    signedIn();
    graphqlDirect.mockResolvedValueOnce({ interviewsOpen: true });
    expect(await (await open(get('/api/me/interviews/open'))).json()).toEqual({ open: true });
    expect(graphqlDirect.mock.calls[0][0]).toBe(InterviewsOpenDocument);
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ githubLogin: 'octocat' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await open(get('/api/me/interviews/open'))).json()).toEqual({ open: false });
  });

  it('is closed for a session that needs a new sign-in', async () => {
    current.session = {
      user: { githubLogin: 'octocat' },
      error: 'RefreshTokenError',
      expires: '2099-01-01T00:00:00.000Z',
    } as Session;
    expect(await (await open(get('/api/me/interviews/open'))).json()).toEqual({ open: false });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('/api/me/interviews/bar', () => {
  it('is null signed out, without asking the API', async () => {
    const response = await bar(get('/api/me/interviews/bar'));
    expect(await response.json()).toEqual({ bar: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("is the API's bar for the person, and null on a failure", async () => {
    signedIn();
    graphqlDirect.mockResolvedValueOnce({ interviewsBar: { mine: true } });
    expect(await (await bar(get('/api/me/interviews/bar'))).json()).toEqual({ bar: { mine: true } });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await bar(get('/api/me/interviews/bar'))).json()).toEqual({ bar: null });
  });
});

describe('/api/me/interviews/report', () => {
  it('refuses a visitor with 401 without asking the API', async () => {
    const response = await report(post(reportBody));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('refuses a body that is not JSON, or not of the shape, with 400', async () => {
    signedIn();
    expect((await report(post(reportBody, 'text/plain'))).status).toBe(400);
    expect((await report(post('not json'))).status).toBe(400);
    expect((await report(post([reportBody]))).status).toBe(400);
    expect((await report(post({ ...reportBody, note: '' }))).status).toBe(400);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("sends the report, and answers the day's limit with 429", async () => {
    signedIn();
    graphqlDirect.mockResolvedValueOnce({ reportInterviewFact: true });
    const sent = await report(post(reportBody));
    expect(sent.status).toBe(200);
    expect(await sent.json()).toEqual({ ok: true, data: true });
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ githubLogin: 'octocat' });

    graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'no', extensions: { code: 'TOO_MANY_REQUESTS' } }])),
    );
    const limited = await report(post(reportBody));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, error: 'LIMITED' });

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect((await report(post(reportBody))).status).toBe(502);
  });
});
