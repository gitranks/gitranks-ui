import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applicationOf, FOUND, REGISTRIES, viewOf } from './__fixtures__/apply';
import { answerBy, jsonResponse, sentOf } from '@/app/admin/unsung-hero/__fixtures__/api';
import { REGISTRY_IDS, REGISTRIES as REGISTRY_TABLE } from '@/lib/packages/registries';

const { currentSessionToken, signedFetch, graphqlDirect } = vi.hoisted(() => ({
  currentSessionToken: vi.fn(),
  signedFetch: vi.fn(),
  graphqlDirect: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/workspace/session-token', () => ({ currentSessionToken }));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { cancelApplication, resolveApplyPackage, sendApplication } = await import('./actions');
const { readHeroApply } = await import('@/lib/unsung-hero/apply-api');

const SIGNED_IN = { githubLogin: 'octocat', email: 'octocat@example.com', verifiedEmail: 'octocat@example.com' };
const IN_REVIEW = applicationOf();

/** The last argument `signedFetch` was given: whether the session's email is the verified one. */
const verifiedOf = () => signedFetch.mock.calls.map((call) => call[5]);

beforeEach(() => {
  currentSessionToken.mockReset().mockResolvedValue(SIGNED_IN);
  signedFetch.mockReset();
  graphqlDirect.mockReset();
});

describe('the page’s read', () => {
  it('a visitor: the registries alone, from the read every visitor shares', async () => {
    graphqlDirect.mockResolvedValue({ heroApply: { registries: REGISTRIES } });
    expect(await readHeroApply({ accountEmailVerified: false })).toEqual({
      registries: REGISTRIES,
      viewer: null,
      application: null,
      packages: [],
    });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('signed in: the viewer’s own answer, as the viewer, never kept', async () => {
    const view = viewOf({ application: IN_REVIEW });
    answerBy(signedFetch, { HeroApply: () => jsonResponse({ data: { heroApply: view } }) });
    expect(await readHeroApply({ githubLogin: 'octocat', accountEmailVerified: false })).toEqual(view);
    expect(sentOf(signedFetch)[0]).toMatchObject({ operation: 'HeroApply', source: 'ssr', githubLogin: 'octocat' });
    expect(signedFetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('null when the API cannot be read', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await readHeroApply({ accountEmailVerified: false })).toBeNull();
    signedFetch.mockRejectedValue(new Error('down'));
    expect(await readHeroApply({ githubLogin: 'octocat', accountEmailVerified: false })).toBeNull();
  });
});

describe('looking a nomination up', () => {
  it('asks as the signed-in viewer, with what they typed, trimmed', async () => {
    answerBy(signedFetch, { HeroApplyResolve: () => jsonResponse({ data: { heroApplyResolve: FOUND } }) });
    expect(await resolveApplyPackage('  https://www.npmjs.com/package/fast-diff ')).toEqual(FOUND);
    expect(sentOf(signedFetch)).toEqual([
      {
        operation: 'HeroApplyResolve',
        variables: { input: 'https://www.npmjs.com/package/fast-diff' },
        source: 'client',
        githubLogin: 'octocat',
        accountEmail: 'octocat@example.com',
      },
    ]);
  });

  it("passes every listed registry's page link through as typed, for the lookup to read", async () => {
    answerBy(signedFetch, { HeroApplyResolve: () => jsonResponse({ data: { heroApplyResolve: FOUND } }) });
    const links = REGISTRY_IDS.map((id) => REGISTRY_TABLE[id].pageUrl(REGISTRY_TABLE[id].examples[0]));
    expect(links).toEqual([
      'https://www.npmjs.com/package/react',
      'https://pypi.org/project/requests/',
      'https://pkg.go.dev/github.com/gin-gonic/gin',
      'https://crates.io/crates/serde',
      'https://pub.dev/packages/http',
      'https://packagist.org/packages/laravel/framework',
      'https://central.sonatype.com/artifact/org.slf4j/slf4j-api',
    ]);
    for (const link of links) await resolveApplyPackage(` ${link} `);
    expect(sentOf(signedFetch).map(({ variables }) => (variables as { input: string }).input)).toEqual(links);
  });

  it('asks nothing for nothing typed, or for a visitor', async () => {
    expect(await resolveApplyPackage('   ')).toEqual({ status: 'NOT_FOUND', packages: [] });
    currentSessionToken.mockResolvedValue(null);
    expect(await resolveApplyPackage('left-pad')).toEqual({ status: 'UNAVAILABLE', packages: [] });
    expect(signedFetch).not.toHaveBeenCalled();
  });
});

describe('sending', () => {
  const sent = (answer: unknown) =>
    answerBy(signedFetch, { HeroApplySend: () => jsonResponse({ data: { heroApplySend: answer } }) });

  it('a package of the viewer’s own: its registry and name, the note trimmed, the verified email’s claim', async () => {
    sent({ ok: true, refusal: null, application: IN_REVIEW });
    const answer = await sendApplication({ registry: 'NPM', name: 'tiny-clamp', note: '  Used everywhere.  ' });
    expect(answer).toEqual({ ok: true, refusal: null, application: IN_REVIEW });
    expect(sentOf(signedFetch)[0]).toMatchObject({
      operation: 'HeroApplySend',
      variables: { input: { registry: 'NPM', name: 'tiny-clamp', note: 'Used everywhere.' } },
      githubLogin: 'octocat',
      accountEmail: 'octocat@example.com',
    });
    expect(verifiedOf()).toEqual([true]);
  });

  it('a nomination as typed, never with a package beside it, and no blank note', async () => {
    sent({ ok: true, refusal: null, application: IN_REVIEW });
    await sendApplication({ typed: ' left-padder ', note: '   ' });
    await sendApplication({ registry: 'NPM', name: 'fast-diff', typed: 'fast-diff' });
    expect(sentOf(signedFetch).map(({ variables }) => variables)).toEqual([
      { input: { typed: 'left-padder' } },
      { input: { registry: 'NPM', name: 'fast-diff' } },
    ]);
  });

  it('an email GitHub has not verified is sent without the claim', async () => {
    currentSessionToken.mockResolvedValue({ ...SIGNED_IN, verifiedEmail: undefined });
    sent({ ok: true, refusal: null, application: IN_REVIEW });
    await sendApplication({ registry: 'NPM', name: 'tiny-clamp' });
    expect(verifiedOf()).toEqual([false]);
  });

  it('refuses at once what names no package, and a visitor', async () => {
    expect(await sendApplication({ registry: 'npm', name: 'tiny-clamp' })).toEqual({
      ok: false,
      refusal: 'BAD_INPUT',
      application: null,
    });
    expect(await sendApplication({ note: 'hello' })).toMatchObject({ refusal: 'BAD_INPUT' });
    currentSessionToken.mockResolvedValue(null);
    expect(await sendApplication({ typed: 'left-pad' })).toMatchObject({ refusal: 'SIGN_IN' });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('passes the API’s refusal on; an API that does not answer is UNAVAILABLE', async () => {
    sent({ ok: false, refusal: 'PACKAGE_TAKEN', application: null });
    expect(await sendApplication({ typed: 'fast-diff' })).toMatchObject({ refusal: 'PACKAGE_TAKEN' });
    signedFetch.mockReset().mockRejectedValue(new Error('down'));
    expect(await sendApplication({ typed: 'fast-diff' })).toMatchObject({ refusal: 'UNAVAILABLE' });
  });
});

describe('cancelling', () => {
  it('asks as the viewer and passes the answer on', async () => {
    answerBy(signedFetch, {
      HeroApplyCancel: () => jsonResponse({ data: { heroApplyCancel: { ok: false, refusal: 'NOT_CANCELLABLE' } } }),
    });
    expect(await cancelApplication()).toMatchObject({ ok: false, refusal: 'NOT_CANCELLABLE' });
    expect(sentOf(signedFetch)[0]).toMatchObject({ operation: 'HeroApplyCancel', variables: {} });
  });
});
