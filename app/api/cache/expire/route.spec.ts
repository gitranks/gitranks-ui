import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag }));

const { POST } = await import('./route');
const { isNpmPackageName, NPM_NAME_MAX_LENGTH } = await import('@/lib/packages/npm-package-name');
const { packageCacheTag } = await import('@/lib/packages/package-paths');

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

  it('takes package tags: a scoped name, the characters of a registry name, and the longest name', async () => {
    const tags = [
      'package:npm/react-resize-detector',
      'package:npm/@nebula/ui',
      'package:npm/lodash.debounce',
      'package:npm/@types/node',
      'package:npm/~tilde_name-1.0',
      // An older name, lower-cased: `~'!()*` are refused for new names only.
      "package:npm/it's(ok)!*",
      `package:npm/${'a'.repeat(214)}`,
    ];
    const response = await signed({ tags });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: tags.length });
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it('takes the tag of any name the npm name rule takes, as packageCacheTag writes it', async () => {
    const names = [
      'JSONStream',
      "It's(OK)!*",
      'pkg~Tilde',
      '@Scope/_Private',
      '@types/node',
      'x'.repeat(NPM_NAME_MAX_LENGTH),
    ];
    expect(names.every(isNpmPackageName)).toBe(true);
    const tags = names.map(packageCacheTag);
    const response = await signed({ tags });

    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it.each([
    ['no token', undefined],
    ['a token that is not a bearer', `Basic ${tokenOf({ source: 'gitranks' })}`],
    ['a made-up token', 'Bearer not-a-token'],
    ['a wrong secret', `Bearer ${tokenOf({ source: 'gitranks' }, 'another-secret')}`],
    ['an expired token', `Bearer ${tokenOf({ source: 'gitranks' }, SECRET, { expiresIn: '-1s' })}`],
    ['a token with no end date', `Bearer ${tokenOf({ source: 'gitranks' }, SECRET, {})}`],
    [
      'a token issued an hour ago',
      `Bearer ${tokenOf({ source: 'gitranks', iat: Math.floor(Date.now() / 1000) - 3600 }, SECRET, { expiresIn: '2h' })}`,
    ],
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
    ['a package tag of another registry', { tags: ['package:pypi/requests'] }],
    ['a package tag without a registry', { tags: ['package:react'] }],
    ['a package tag with nothing after the registry', { tags: ['package:npm/'] }],
    ['a package tag in capitals', { tags: ['package:npm/React'] }],
    ['a package tag over 214 characters', { tags: [`package:npm/${'a'.repeat(215)}`] }],
    ['a package tag with a space', { tags: ['package:npm/a b'] }],
    ['a package tag with a character no registry name holds', { tags: ['package:npm/a:b'] }],
    ['a package tag with a percent sign', { tags: ['package:npm/a%20b'] }],
    ['a repository tag with an @', { tags: ['repo:@octo/x'] }],
    ['a profile tag with a ~', { tags: ['profile:octo~cat'] }],
    ['a repository tag over 140 characters, even under 214', { tags: [`repo:${'a'.repeat(141)}`] }],
  ])('answers 400 for %s and expires nothing', async (_name, body) => {
    const response = await signed(body);

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
