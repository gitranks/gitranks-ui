import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch } = vi.hoisted(() => ({ signedFetch: vi.fn() }));

vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

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
    ['an answer that is not JSON', () => signedFetch.mockResolvedValueOnce(new Response('<html>', { status: 200 }))],
    ['a call that throws', () => signedFetch.mockRejectedValueOnce(new Error('timeout'))],
  ])('answers unavailable for %s', async (_case, arrange) => {
    arrange();

    const response = await check({ kind: 'user', name: 'octo-dev' });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ status: 'unavailable' });
  });

  it('passes every answer of the API through', async () => {
    for (const answer of [
      { status: 'found', until: '2026-11-22T10:00:00.000Z' },
      { status: 'limit', nextAt: '2026-11-16T00:00:00.000Z' },
      { status: 'unknown' },
      { status: 'unavailable' },
    ]) {
      upstream(200, answer);
      await expect((await check({ kind: 'user', name: 'octo-dev' })).json()).resolves.toEqual(answer);
    }
  });
});
