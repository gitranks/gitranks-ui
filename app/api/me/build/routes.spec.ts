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
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

type Route = (req: NextRequest, ctx?: unknown) => Promise<Response>;
const ROUTES: Record<string, { GET?: Route; POST?: Route }> = {
  './bar/route': (await import('./bar/route')) as { GET?: Route; POST?: Route },
  './home/route': (await import('./home/route')) as { GET?: Route; POST?: Route },
  './mine/route': (await import('./mine/route')) as { GET?: Route; POST?: Route },
  './projects/route': (await import('./projects/route')) as { GET?: Route; POST?: Route },
  './projects/[project]/route': (await import('./projects/[project]/route')) as { GET?: Route; POST?: Route },
  './projects/[project]/steps/[step]/route': (await import('./projects/[project]/steps/[step]/route')) as {
    GET?: Route;
    POST?: Route;
  },
  './start/route': (await import('./start/route')) as { GET?: Route; POST?: Route },
  './test/route': (await import('./test/route')) as { GET?: Route; POST?: Route },
  './open/route': (await import('./open/route')) as { GET?: Route; POST?: Route },
  './test/start/route': (await import('./test/start/route')) as { GET?: Route; POST?: Route },
  './test/answer/route': (await import('./test/answer/route')) as { GET?: Route; POST?: Route },
  './remove/route': (await import('./remove/route')) as { GET?: Route; POST?: Route },
  './settings/route': (await import('./settings/route')) as { GET?: Route; POST?: Route },
  './settings/save/route': (await import('./settings/save/route')) as { GET?: Route; POST?: Route },
  './doors/route': (await import('./doors/route')) as { GET?: Route; POST?: Route },
};
const route = async (path: string) => ROUTES[path];

const { barTwoTests, homeBuilder, mineFull, projectMineTwo, startFresh, stepMineTwo } = await import(
  '@/lib/build/__fixtures__/builds'
);
const { endTestOpen, testRun } = await import('@/lib/build/__fixtures__/test');
const { buildRemindersOn } = await import('@/lib/build/__fixtures__/settings');
const { keyValueDatabaseStepNine } = await import('@/lib/build/__fixtures__/doors');
const { keyValueDatabaseCard, webServerCard } = await import('@/lib/build/__fixtures__/projects');
const { webServerBuilt } = await import('@/lib/build/__fixtures__/builds');

const URL_BASE = 'https://gitranks.com';
const signedIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};
const params = (value: Record<string, string>) => ({ params: Promise.resolve(value) });

/** Each read: its route, the address asked, the context, the key it answers under, the API's field and a value. */
const READS: [string, string, string, unknown, string, string, unknown][] = [
  ['the bar', './bar/route', '/api/me/build/bar', undefined, 'bar', 'buildBar', barTwoTests],
  ['home', './home/route', '/api/me/build/home', undefined, 'home', 'buildHome', homeBuilder],
  ['my builds', './mine/route', '/api/me/build/mine', undefined, 'mine', 'buildMine', mineFull],
  ['every project', './projects/route', '/api/me/build/projects', undefined, 'builds', 'buildProjectsMine', []],
  [
    'a project',
    './projects/[project]/route',
    '/api/me/build/projects/mcp-server',
    params({ project: 'mcp-server' }),
    'mine',
    'buildProjectMine',
    projectMineTwo,
  ],
  [
    'a step',
    './projects/[project]/steps/[step]/route',
    '/api/me/build/projects/mcp-server/steps/list-the-tools',
    params({ project: 'mcp-server', step: 'list-the-tools' }),
    'mine',
    'buildStepMine',
    stepMineTwo,
  ],
  [
    'the start flow',
    './start/route',
    '/api/me/build/start?project=mcp-server',
    undefined,
    'start',
    'buildStart',
    startFresh,
  ],
  [
    'a test',
    './test/route',
    '/api/me/build/test?project=mcp-server&kind=end',
    undefined,
    'test',
    'buildTest',
    endTestOpen,
  ],
  [
    'the settings',
    './settings/route',
    '/api/me/build/settings',
    undefined,
    'settings',
    'buildSettings',
    buildRemindersOn,
  ],
];

beforeEach(() => {
  graphqlDirect.mockReset();
  current.session = null;
});

describe("Build's personal reads", () => {
  it.each(READS)('answers %s for the session’s person, never kept', async (_, file, path, ctx, key, field, value) => {
    const { GET } = await route(file);
    const get = () => (GET as Route)(new NextRequest(`${URL_BASE}${path}`), ctx);

    const signedOut = await get();
    expect(await signedOut.json()).toEqual({ [key]: null });
    expect(signedOut.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();

    signedIn();
    graphqlDirect.mockResolvedValueOnce({ [field]: value });
    const res = await get();
    expect(await res.json()).toEqual({ [key]: value });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get()).json()).toEqual({ [key]: null });
  });

  it('answers no test for an ask not of the shape, without asking the API', async () => {
    signedIn();
    const { GET } = await route('./test/route');
    const res = await (GET as Route)(new NextRequest(`${URL_BASE}/api/me/build/test?project=mcp-server&kind=silver`));
    expect(await res.json()).toEqual({ test: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('whether Build is open to the person', () => {
  it('is closed signed out without asking, open only for a real true, closed on a failure', async () => {
    const { GET } = await route('./open/route');
    const get = () => (GET as Route)(new NextRequest(`${URL_BASE}/api/me/build/open`));
    const signedOut = await get();
    expect(await signedOut.json()).toEqual({ open: false });
    expect(signedOut.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();

    signedIn();
    graphqlDirect.mockResolvedValueOnce({ buildOpen: true });
    expect(await (await get()).json()).toEqual({ open: true });
    graphqlDirect.mockResolvedValueOnce({ buildOpen: 'yes' });
    expect(await (await get()).json()).toEqual({ open: false });
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "buildOpen"'));
    expect(await (await get()).json()).toEqual({ open: false });
  });
});

describe("Build's personal writes", () => {
  const post = (body: unknown, type = 'application/json') =>
    new NextRequest(`${URL_BASE}/api/me/build/x`, {
      method: 'POST',
      headers: { 'content-type': type },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  const WRITES: [string, string, unknown, string, unknown][] = [
    ['starts a test', './test/start/route', { project: 'mcp-server', kind: 'end' }, 'startBuildTest', testRun],
    [
      'answers a question',
      './test/answer/route',
      { run: 'r-1', question: 't-stderr', pick: 0 },
      'answerBuildTest',
      { run: testRun, result: null },
    ],
    ['removes a build', './remove/route', { build: 'b-mcp-ts' }, 'removeBuild', true],
    ['saves the settings', './settings/save/route', { reminders: false }, 'saveBuildSettings', { reminders: false }],
  ];

  it.each(WRITES)('%s for the session’s person, with the status of a refusal', async (_, file, body, field, value) => {
    const { POST } = await route(file);
    const send = (req: NextRequest) => (POST as Route)(req);

    const signedOut = await send(post(body));
    expect(signedOut.status).toBe(401);
    expect(await signedOut.json()).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(signedOut.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();

    signedIn();
    const form = await send(post('build=b-mcp-ts', 'application/x-www-form-urlencoded'));
    expect(form.status).toBe(400);
    expect(await (await send(post('[1]'))).json()).toEqual({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();

    graphqlDirect.mockResolvedValueOnce({ [field]: value });
    const res = await send(post(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: value });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'client', githubLogin: 'octocat' });

    graphqlDirect.mockRejectedValueOnce(new Error(JSON.stringify([{ extensions: { code: 'CONFLICT' } }])));
    expect((await send(post(body))).status).toBe(409);
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect((await send(post(body))).status).toBe(502);
  });
});

describe('the doors into Build', () => {
  const get = async (query: string) => {
    const { GET } = await route('./doors/route');
    return (GET as Route)(new NextRequest(`${URL_BASE}/api/me/build/doors?${query}`));
  };

  it("answers a course's projects and the person's builds of them, never kept", async () => {
    expect(await (await get('course=algorithms')).json()).toEqual({ doors: null });
    expect(graphqlDirect).not.toHaveBeenCalled();

    signedIn();
    graphqlDirect.mockImplementation(async (_doc: unknown, variables: Record<string, unknown> | undefined) =>
      variables && 'course' in variables
        ? { buildCourseProjects: [keyValueDatabaseCard] }
        : { buildProjectsMine: [keyValueDatabaseStepNine, webServerBuilt] },
    );
    const res = await get('course=algorithms');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({
      doors: { projects: [keyValueDatabaseCard], builds: [keyValueDatabaseStepNine] },
    });
  });

  it("reads the course of an issue's lesson", async () => {
    signedIn();
    graphqlDirect.mockImplementation(async (_doc: unknown, variables: Record<string, unknown> | undefined) => {
      if (variables && 'slug' in variables) return { learnLesson: { course: { slug: 'algorithms' } } };
      if (variables && 'course' in variables) return { buildCourseProjects: [webServerCard] };
      return { buildProjectsMine: [] };
    });
    expect(await (await get('lesson=find-duplicates')).json()).toEqual({
      doors: { projects: [webServerCard], builds: [] },
    });
    expect(graphqlDirect.mock.calls.some(([, variables]) => variables?.course === 'algorithms')).toBe(true);
  });

  it('answers none when Build is not open to the person, and for an ask not of the shape', async () => {
    signedIn();
    graphqlDirect.mockImplementation(async (_doc: unknown, variables: Record<string, unknown> | undefined) => {
      if (variables && 'course' in variables) return { buildCourseProjects: [keyValueDatabaseCard] };
      throw new Error(JSON.stringify([{ extensions: { code: 'NOT_FOUND' } }]));
    });
    expect(await (await get('course=algorithms')).json()).toEqual({ doors: null });
    graphqlDirect.mockClear();
    expect(await (await get('course=Not%20a%20slug')).json()).toEqual({ doors: null });
    expect(await (await get('')).json()).toEqual({ doors: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
