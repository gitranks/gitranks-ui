import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
  loadAttemptRef: vi.fn(),
  loadIssueAttempt: vi.fn(),
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
const learn = vi.hoisted(() => ({ lesson: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => ({ loadAttemptLesson: learn.lesson }));
vi.mock('@/lib/seo/site', () => ({ SITE_URL: 'https://gitranks.com' }));

const { GET } = await import('./route');

// As behind the proxy: the request URL is the server's bind address, never the site's.
const call = (attemptId: string, query = '', cookie?: string) =>
  GET(
    new Request(`https://0.0.0.0:3000/my/pull-requests/by-attempt/${attemptId}${query}`, {
      headers: cookie ? { cookie } : {},
    }),
    { params: Promise.resolve({ attemptId }) } as never,
  );

/** A page of its own, never kept: its status, its words, and the way back. */
async function expectPage(answer: Response, status: number, title: string) {
  expect(answer.status).toBe(status);
  expect(answer.headers.get('cache-control')).toBe('private, no-store');
  expect(answer.headers.get('content-type')).toBe('text/html; charset=utf-8');
  const html = await answer.text();
  expect(html).toContain(`<h1>${title}</h1>`);
  expect(html).toContain('<a href="/my/pull-requests">← Pull requests</a>');
  expect(html).toContain('<meta name="robots" content="noindex">');
}

const first = {
  attemptId: 'A_1',
  kind: 'FIRST',
  mode: 'FIX',
  nameWithOwner: 'acme/widgets',
  number: 42,
  followUpOf: null,
};
const issue = { attemptId: 'A_1', mode: 'FIX', repo: 'acme/gadgets', number: 42, earlier: null };

beforeEach(() => {
  vi.clearAllMocks();
  data.viewerLogin.mockResolvedValue('octocat');
  data.loadAttemptRef.mockResolvedValue(first);
  data.loadIssueAttempt.mockResolvedValue(issue);
});

describe('the address by attempt', () => {
  it("answers a 307 nobody keeps to the pull request's page, on the site's own address, the query kept", async () => {
    const answer = await call('A_1', '?session=next&move=changes&resume=n0nce');
    expect(answer.status).toBe(307);
    expect(answer.headers.get('location')).toBe(
      'https://gitranks.com/my/pull-requests/acme/gadgets/42?session=next&move=changes&resume=n0nce',
    );
    expect(answer.headers.get('cache-control')).toBe('private, no-store');
    // The issue is asked for by the attempt's own repo and number; its answer carries the current name.
    expect(data.loadIssueAttempt).toHaveBeenCalledWith('acme', 'widgets', 42);
  });

  it("sends a run to its session under its first attempt's page", async () => {
    data.loadAttemptRef.mockResolvedValue({
      ...first,
      attemptId: 'A_F2',
      kind: 'FOLLOW_UP',
      mode: null,
      followUpOf: { attemptId: 'A_1' },
    });
    expect((await call('A_F2')).headers.get('location')).toBe(
      'https://gitranks.com/my/pull-requests/acme/gadgets/42/runs/A_F2',
    );
  });

  it("sends a Learn attempt to the view its lesson's stage names, the Pull request view once it is open", async () => {
    data.loadAttemptRef.mockResolvedValue({ ...first, mode: 'LEARN', pullRequest: null });
    learn.lesson.mockResolvedValue({ stage: 'LESSON' });
    expect((await call('A_1', '?resume=n0nce')).headers.get('location')).toBe(
      'https://gitranks.com/my/pull-requests/acme/gadgets/42/lesson?resume=n0nce',
    );
    data.loadAttemptRef.mockResolvedValue({ ...first, mode: 'LEARN', pullRequest: { prId: 'PR_1' } });
    learn.lesson.mockResolvedValue({ stage: 'PR_OPEN' });
    expect((await call('A_1')).headers.get('location')).toBe('https://gitranks.com/my/pull-requests/acme/gadgets/42');
  });

  it('answers a 404 page, with the way back, for an attempt that is not the viewer’s or has no page', async () => {
    data.loadAttemptRef.mockResolvedValue(null);
    await expectPage(await call('A_9'), 404, "This page isn't here");
    data.loadAttemptRef.mockResolvedValue({ ...first, nameWithOwner: null });
    await expectPage(await call('A_1'), 404, "This page isn't here");
    data.loadAttemptRef.mockResolvedValue(first);
    data.loadIssueAttempt.mockResolvedValue(null);
    await expectPage(await call('A_1'), 404, "This page isn't here");
  });

  it('answers a malformed id with the 404 page before anything is read, signed in or not', async () => {
    data.viewerLogin.mockResolvedValue(null);
    await expectPage(await call('A%2F1'), 404, "This page isn't here");
    await expectPage(await call('x'.repeat(65)), 404, "This page isn't here");
    expect(data.viewerLogin).not.toHaveBeenCalled();
  });

  it('answers a 503 page, with the way back, while the API does not answer', async () => {
    data.loadAttemptRef.mockResolvedValue(undefined);
    const attempt = await call('A_1');
    await expectPage(attempt, 503, "This page didn't load");
    data.loadAttemptRef.mockResolvedValue(first);
    data.loadIssueAttempt.mockResolvedValue(undefined);
    await expectPage(await call('A_1'), 503, "This page didn't load");
  });

  it('drops a session that ended on the way and asks the same address again, its query whole, for the sign-in there', async () => {
    data.viewerLogin.mockResolvedValue(null);
    const answer = await call(
      'A_1',
      '?resume=n0nce&session=next',
      '__Secure-authjs.session-token.0=a; __Secure-authjs.session-token.1=b; has-session=1; theme=dark',
    );
    expect(answer.status).toBe(307);
    expect(answer.headers.get('location')).toBe(
      'https://gitranks.com/my/pull-requests/by-attempt/A_1?resume=n0nce&session=next',
    );
    expect(answer.headers.get('cache-control')).toBe('private, no-store');
    const cleared = answer.headers.getSetCookie();
    expect(cleared).toEqual([
      '__Secure-authjs.session-token.0=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
      '__Secure-authjs.session-token.1=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    ]);
    expect(data.loadAttemptRef).not.toHaveBeenCalled();
    // No session to drop (nothing past the proxy can be one): the 404 page, never a loop.
    await expectPage(await call('A_1', '?resume=n0nce'), 404, "This page isn't here");
  });
});
