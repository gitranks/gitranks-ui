import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, sessionTokenOf } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  sessionTokenOf: vi.fn<() => Promise<Record<string, unknown> | null>>(async () => null),
}));

vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));

const { POST } = await import('./route');

const check = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new NextRequest('https://gitranks.com/api/daily-updates/badge-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

const sent = () => JSON.parse(String(signedFetch.mock.calls[0][1].body));

describe('/api/daily-updates/badge-check', () => {
  beforeEach(() => {
    signedFetch.mockReset();
  });

  it('needs no session: passes a profile on, signed for the site with no login, with the address', async () => {
    upstream(200, { status: 'not_found', checksLeft: 2 });

    const response = await check(
      { kind: 'user', name: 'octo-dev' },
      { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Set-Cookie')).toBeNull();
    await expect(response.json()).resolves.toEqual({ status: 'not_found', checksLeft: 2 });
    expect(signedFetch).toHaveBeenCalledOnce();
    const [path, init, source, login] = signedFetch.mock.calls[0];
    expect([path, init.method, init.cache, source, login]).toEqual([
      '/ui/badge-check',
      'POST',
      'no-store',
      'client',
      undefined,
    ]);
    expect(sent()).toEqual({ kind: 'user', name: 'octo-dev', ip: '203.0.113.7' });
  });

  it('takes the first forwarded address without the edge header, and an empty one without either', async () => {
    upstream(200, { status: 'found', until: '2026-11-22T10:00:00.000Z' });
    await check({ kind: 'repo', name: 'acme/fast.queue' }, { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' });
    expect(sent()).toEqual({ kind: 'repo', name: 'acme/fast.queue', ip: '198.51.100.1' });

    signedFetch.mockReset();
    upstream(200, { status: 'unknown' });
    await check({ kind: 'user', name: 'octo-dev' });
    expect(sent().ip).toBe('');
  });

  it.each([
    ['no JSON', 'not json'],
    ['no kind', { name: 'octo-dev' }],
    ['an organization', { kind: 'org', name: 'acme' }],
    ['a login GitHub would never give', { kind: 'user', name: 'octo dev' }],
    ['a name that is not a string', { kind: 'user', name: 42 }],
    ['a repository without a name', { kind: 'repo', name: 'acme' }],
    ['a repository with a path', { kind: 'repo', name: 'acme/fastqueue/extra' }],
    ['a package without its registry', { kind: 'package', name: 'react' }],
    ['a package of another registry', { kind: 'package', name: 'pypi/react' }],
    ['a package name npm refuses', { kind: 'package', name: 'npm/.hidden' }],
    ['a body over the cap', { kind: 'user', name: 'octo-dev', padding: 'x'.repeat(600) }],
  ])('answers 400 and calls nothing for %s', async (_case, body) => {
    const response = await check(body);

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['an error status', () => upstream(503, { message: 'down' })],
    ['an answer of another shape', () => upstream(200, { status: 'maybe' })],
    ['found without its date', () => upstream(200, { status: 'found' })],
    ['not found without its count', () => upstream(200, { status: 'not_found' })],
    ['not found with a count that is not a number', () => upstream(200, { status: 'not_found', checksLeft: '2' })],
    ['a limit with a date that is not one', () => upstream(200, { status: 'limit', nextAt: 'soon' })],
    ['an answer that is not JSON', () => signedFetch.mockResolvedValueOnce(new Response('<html>', { status: 200 }))],
    ['a call that throws', () => signedFetch.mockRejectedValueOnce(new Error('timeout'))],
  ])('answers unavailable for %s', async (_case, arrange) => {
    arrange();

    const response = await check({ kind: 'user', name: 'octo-dev' });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ status: 'unavailable' });
  });

  it('refuses a body by its stated size before reading it', async () => {
    const response = await check({ kind: 'user', name: 'octo-dev' }, { 'content-length': '5000' });

    expect(response.status).toBe(400);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('takes a repository whose owner has a login from GitHub’s early years, with a hyphen at either end', async () => {
    upstream(200, { status: 'unknown' });

    expect((await check({ kind: 'repo', name: '-Jerry-/repo' })).status).toBe(200);
    expect(sent()).toMatchObject({ kind: 'repo', name: '-Jerry-/repo' });
  });

  it('takes a package by `npm/<name>`, scoped too', async () => {
    upstream(200, { status: 'not_found', checksLeft: 2 });
    expect((await check({ kind: 'package', name: 'npm/@nebula/ui' })).status).toBe(200);
    expect(sent()).toEqual({ kind: 'package', name: 'npm/@nebula/ui', ip: '' });
  });

  it('names a signed-in visitor by login and email, so the API can tell whether packages are shown to them', async () => {
    sessionTokenOf.mockResolvedValueOnce({ githubLogin: 'octo-dev', email: ' octo@example.com ' });
    upstream(200, { status: 'no_repository' });

    const response = await check({ kind: 'package', name: 'npm/react' });

    await expect(response.json()).resolves.toEqual({ status: 'no_repository' });
    const [, , source, login, email] = signedFetch.mock.calls[0];
    expect([source, login, email]).toEqual(['client', 'octo-dev', 'octo@example.com']);
  });

  it('names no one for a session that needs a new sign-in, and leaves out an email that is not one', async () => {
    sessionTokenOf.mockResolvedValueOnce({ githubLogin: 'octo-dev', error: 'RefreshTokenError' });
    upstream(200, { status: 'unknown' });
    await check({ kind: 'user', name: 'octo-dev' });
    expect(signedFetch.mock.calls[0]).toHaveLength(3);

    signedFetch.mockReset();
    sessionTokenOf.mockResolvedValueOnce({ githubLogin: 'octo-dev', email: 'not-an-email' });
    upstream(200, { status: 'unknown' });
    await check({ kind: 'user', name: 'octo-dev' });
    expect(signedFetch.mock.calls[0].slice(2)).toEqual(['client', 'octo-dev']);
  });

  it('passes every answer of the API through', async () => {
    for (const answer of [
      { status: 'found', until: '2026-11-22T10:00:00.000Z' },
      { status: 'no_repository' },
      { status: 'limit', nextAt: '2026-11-16T00:00:00.000Z' },
      { status: 'unknown' },
      { status: 'unavailable' },
    ]) {
      upstream(200, answer);
      await expect((await check({ kind: 'user', name: 'octo-dev' })).json()).resolves.toEqual(answer);
    }
  });
});
