import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
  loadAttemptRef: vi.fn(),
  loadIssueAttempt: vi.fn(),
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
vi.mock('@/lib/seo/site', () => ({ SITE_URL: 'https://gitranks.com' }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const { GET } = await import('./route');

// As behind the proxy: the request URL is the server's bind address, never the site's.
const call = (attemptId: string, query = '') =>
  GET(new Request(`https://0.0.0.0:3000/my/pull-requests/by-attempt/${attemptId}${query}`), {
    params: Promise.resolve({ attemptId }),
  } as never);

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

  it('answers the 404 for an attempt that is not the viewer’s or has no page', async () => {
    data.loadAttemptRef.mockResolvedValue(null);
    await expect(call('A_9')).rejects.toThrow('NEXT_NOT_FOUND');
    data.loadAttemptRef.mockResolvedValue({ ...first, nameWithOwner: null });
    await expect(call('A_1')).rejects.toThrow('NEXT_NOT_FOUND');
    data.loadAttemptRef.mockResolvedValue(first);
    data.loadIssueAttempt.mockResolvedValue(null);
    await expect(call('A_1')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it("says the page didn't load while the API does not answer, kept by nobody", async () => {
    data.loadAttemptRef.mockResolvedValue(undefined);
    const attempt = await call('A_1');
    expect(attempt.status).toBe(503);
    expect(await attempt.text()).toBe("This page didn't load. Reload to try again.");
    expect(attempt.headers.get('cache-control')).toBe('private, no-store');
    data.loadAttemptRef.mockResolvedValue(first);
    data.loadIssueAttempt.mockResolvedValue(undefined);
    expect((await call('A_1')).status).toBe(503);
  });

  it("sends a session that ended on the way to the workspace's sign-in", async () => {
    data.viewerLogin.mockResolvedValue(null);
    const answer = await call('A_1', '?session=next');
    expect(answer.headers.get('location')).toBe('https://gitranks.com/my/pull-requests');
    expect(data.loadAttemptRef).not.toHaveBeenCalled();
  });
});
