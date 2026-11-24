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

  it("expires a PyPI project's tag in the spelling its pages carry, whatever spelling is sent", async () => {
    const response = await signed({
      tags: ['package:pypi/zope.interface', 'package:pypi/zope_interface', 'package:pypi/requests'],
    });

    expect(response.status).toBe(200);
    // Two spellings of one project are one tag: the count is of the tags expired.
    expect(await response.json()).toEqual({ expired: 2 });
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual([
      'package:pypi/zope-interface',
      'package:pypi/requests',
    ]);
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
    const tags = names.map((name) => packageCacheTag('npm', name));
    const response = await signed({ tags });

    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it("takes Unsung hero's tag, alone and beside a repository's", async () => {
    const alone = await signed({ tags: ['unsung-hero'] });

    expect(alone.status).toBe(200);
    expect(await alone.json()).toEqual({ expired: 1 });
    expect(revalidateTag.mock.calls).toEqual([['unsung-hero', { expire: 0 }]]);

    revalidateTag.mockReset();
    const beside = await signed({ tags: ['unsung-hero', 'repo:octo-labs/scroll-guard'] });

    expect(beside.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(['unsung-hero', 'repo:octo-labs/scroll-guard']);
  });

  it("takes Learn's tags: the list of courses, a course and a lesson, beside the others", async () => {
    const tags = ['learn:courses', 'learn:course:algorithms', `learn:lesson:${'a'.repeat(100)}`, 'profile:octocat'];
    const response = await signed({ tags });

    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it("takes the fixes' tags: the list of merged fixes and one fix's, beside the others", async () => {
    const tags = ['learn:fixes', 'learn:fix:octo-labs/scroll.guard#42', 'learn:courses', 'profile:octocat'];
    const response = await signed({ tags });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: 4 });
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it("takes a Skills page's tag and a project's Learn card tags, beside the others, as they are sent", async () => {
    const tags = [
      'skills:octocat',
      `skills:${'a'.repeat(39)}`,
      'skills:-jerry-',
      'learn:entity:repo:django/django',
      'learn:entity:repo:octo-labs/scroll.guard_2',
      `learn:entity:repo:${'a'.repeat(39)}/${'b'.repeat(100)}`,
      'learn:entity:repo:octo/.github',
      'learn:entity:org:kubernetes',
      'learn:entity:org:synchro--',
      'profile:octocat',
    ];
    const response = await signed({ tags });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: tags.length });
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(tags);
  });

  it("expires a fix's tag in the lower case its pages carry, whatever case is sent, once", async () => {
    const response = await signed({
      tags: ['learn:fix:Octo-Labs/Scroll_Guard#7', 'learn:fix:octo-labs/scroll_guard#7'],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: 1 });
    expect(revalidateTag.mock.calls).toEqual([['learn:fix:octo-labs/scroll_guard#7', { expire: 0 }]]);
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
    ['a package tag of another registry', { tags: ['package:cargo/serde'] }],
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
    ["Unsung hero's tag in capitals", { tags: ['Unsung-Hero'] }],
    ["Unsung hero's tag with a suffix", { tags: ['unsung-hero:2026-W47'] }],
    ['the plural of the hero tag', { tags: ['unsung-heroes'] }],
    ['another kind of Learn tag', { tags: ['learn:lessons'] }],
    ['a Learn tag with no slug', { tags: ['learn:course:'] }],
    ['a Learn tag in capitals', { tags: ['learn:lesson:Hash-Sets'] }],
    ['a Learn tag with a doubled hyphen', { tags: ['learn:lesson:hash--sets'] }],
    ['a Learn tag ending in a hyphen', { tags: ['learn:course:sets-'] }],
    ['a Learn tag over 100 characters', { tags: [`learn:lesson:${'a'.repeat(101)}`] }],
    ['a Learn tag with a line break', { tags: ['learn:lesson:sets\n'] }],
    ['a Learn tag with a slash', { tags: ['learn:course:a/b'] }],
    ['the singular of the fixes tag', { tags: ['learn:fix'] }],
    ['a fix tag with no pull request', { tags: ['learn:fix:'] }],
    ['a fix tag with no number', { tags: ['learn:fix:octo/repo'] }],
    ['a fix tag with a number of 0', { tags: ['learn:fix:octo/repo#0'] }],
    ['a fix tag with a leading zero', { tags: ['learn:fix:octo/repo#07'] }],
    ['a fix tag with no repository', { tags: ['learn:fix:octo#7'] }],
    ['a fix tag as a link', { tags: ['learn:fix:https://github.com/octo/repo/pull/7'] }],
    ['a fix tag with a slash before the number', { tags: ['learn:fix:octo/repo/7'] }],
    ['a fix tag with a space', { tags: ['learn:fix:octo/repo #7'] }],
    ['a fix tag with a line break', { tags: ['learn:fix:octo/repo#7\n'] }],
    ['a fix tag with an owner starting with a hyphen', { tags: ['learn:fix:-octo/repo#7'] }],
    ['a fix tag in capitals before the pull request', { tags: ['Learn:Fix:octo/repo#7'] }],
    ['a walkthrough tag', { tags: ['learn:walkthrough:octo/repo#7'] }],
    ['a Skills tag with no login', { tags: ['skills:'] }],
    ['a Skills tag in capitals', { tags: ['skills:OctoCat'] }],
    ['a Skills tag over 39 characters', { tags: [`skills:${'a'.repeat(40)}`] }],
    ['a Skills tag with a dot', { tags: ['skills:octo.cat'] }],
    ['a Skills tag with a slash', { tags: ['skills:octo/cat'] }],
    ['a Skills tag with a line break', { tags: ['skills:octocat\n'] }],
    ['the plural of the Skills tag', { tags: ['skills'] }],
    ['a Skills tag of another kind', { tags: ['skills:page:octocat'] }],
    ['a Learn card tag of another kind', { tags: ['learn:entity:user:octocat'] }],
    ['a Learn card tag with nothing after the kind', { tags: ['learn:entity:repo:'] }],
    ['a repository card tag with no name', { tags: ['learn:entity:repo:django'] }],
    ['a repository card tag with an empty name', { tags: ['learn:entity:repo:django/'] }],
    ['a repository card tag in capitals', { tags: ['learn:entity:repo:Django/django'] }],
    ['a repository card tag with three parts', { tags: ['learn:entity:repo:a/b/c'] }],
    ['a repository card tag named .', { tags: ['learn:entity:repo:octo/.'] }],
    ['a repository card tag named ..', { tags: ['learn:entity:repo:octo/..'] }],
    ['a repository card tag with an owner over 39', { tags: [`learn:entity:repo:${'a'.repeat(40)}/b`] }],
    ['a repository card tag with a name over 100', { tags: [`learn:entity:repo:a/${'b'.repeat(101)}`] }],
    ['a repository card tag with a dot in the owner', { tags: ['learn:entity:repo:octo.labs/b'] }],
    ['a repository card tag with a space', { tags: ['learn:entity:repo:octo/hello world'] }],
    ['an org card tag in capitals', { tags: ['learn:entity:org:Kubernetes'] }],
    ['an org card tag with a slash', { tags: ['learn:entity:org:octo/x'] }],
    ['an org card tag over 39 characters', { tags: [`learn:entity:org:${'a'.repeat(40)}`] }],
    ['an org card tag with a line break', { tags: ['learn:entity:org:octo\n'] }],
    ['one bad Skills tag among good ones', { tags: ['skills:octocat', 'learn:entity:org:octo', 'skills:Octo'] }],
  ])('answers 400 for %s and expires nothing', async (_name, body) => {
    const response = await signed(body);

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
