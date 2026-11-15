import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag }));

const { POST } = await import('./route');

const SECRET = 'spec-secret';

const tokenOf = (claims: object, secret = SECRET, options: jwt.SignOptions = { expiresIn: '5m' }) =>
  jwt.sign(claims, secret, options);

const post = (body: unknown, authorization?: string) =>
  POST(
    new NextRequest('https://gitranks.com/api/cache/expire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const signed = (body: unknown, claims: object = { source: 'gitranks' }) => post(body, `Bearer ${tokenOf(claims)}`);

const TAGS = ['repo:octo-org/hello.world', 'profile:octocat'];

describe('POST /api/cache/expire', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('expires each tag at once and says how many', async () => {
    const response = await signed({ tags: TAGS });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: 2 });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateTag.mock.calls).toEqual([
      ['repo:octo-org/hello.world', { expire: 0 }],
      ['profile:octocat', { expire: 0 }],
    ]);
  });

  it('takes 100 tags and the longest names', async () => {
    const tags = Array.from({ length: 99 }, (_, index) => `repo:octo/widgets_${index}`);
    const response = await signed({ tags: [...tags, `profile:${'-'.repeat(140)}`] });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: 100 });
    expect(revalidateTag).toHaveBeenCalledTimes(100);
  });

  it.each([
    ['no token', undefined],
    ['a token that is not a bearer', `Basic ${tokenOf({ source: 'gitranks' })}`],
    ['a made-up token', 'Bearer not-a-token'],
    ['a wrong secret', `Bearer ${tokenOf({ source: 'gitranks' }, 'another-secret')}`],
    ['an expired token', `Bearer ${tokenOf({ source: 'gitranks' }, SECRET, { expiresIn: '-1s' })}`],
    ['another algorithm', `Bearer ${tokenOf({ source: 'gitranks' }, SECRET, { algorithm: 'HS512', expiresIn: '5m' })}`],
    ['an unsigned token', `Bearer ${tokenOf({ source: 'gitranks' }, '', { algorithm: 'none' })}`],
  ])('answers 401 for %s', async (_name, authorization) => {
    const response = await post({ tags: TAGS }, authorization);

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('answers 401 for every call while the secret is unset', async () => {
    vi.stubEnv('INTERNAL_JWT_SECRET', '');
    const response = await post({ tags: TAGS }, `Bearer ${tokenOf({ source: 'gitranks' }, '', { algorithm: 'none' })}`);

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ['a page render', { source: 'ssr' }],
    ['a visitor', { source: 'client', githubLogin: 'octocat' }],
    ['a badge', { source: 'badge' }],
    ['a build', { source: 'build' }],
    ['no source', {}],
    ['another spelling', { source: 'GitRanks' }],
  ])("answers 403 for the site's own token of %s", async (_name, claims) => {
    const response = await signed({ tags: TAGS }, claims);

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ['no body', ''],
    ['a body that is not JSON', '{'],
    ['no tags', {}],
    ['tags that are not a list', { tags: 'profile:octocat' }],
    ['an empty list', { tags: [] }],
    ['over 100 tags', { tags: Array.from({ length: 101 }, (_, index) => `profile:octocat${index}`) }],
    ['a tag that is not a string', { tags: ['profile:octocat', 42] }],
    ['another kind of tag', { tags: ['org:octo-org'] }],
    ['a tag without a kind', { tags: ['octocat'] }],
    ['a tag in capitals', { tags: ['profile:OctoCat'] }],
    ['a tag with nothing after the kind', { tags: ['repo:'] }],
    ['a tag over 140 characters', { tags: [`repo:${'a'.repeat(141)}`] }],
    ['a tag with a space', { tags: ['repo:octo/hello world'] }],
    ['a tag with a line break', { tags: ['profile:octocat\n'] }],
    ['one bad tag among good ones', { tags: [...TAGS, 'ranking:global'] }],
  ])('answers 400 for %s and expires nothing', async (_name, body) => {
    const response = await signed(body);

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
