import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';

type Redirect = Awaited<ReturnType<NonNullable<typeof nextConfig.redirects>>>[number];

const redirects = (await nextConfig.redirects?.()) ?? [];

/**
 * Where the site sends an address, as Next matches its redirects: the first row whose path (case aside, strictly as
 * written) and query conditions match, the query kept. Null when none does.
 */
function redirectOf(address: string): { location: string; status: number } | null {
  const url = new URL(address, 'https://gitranks.com');
  const query = Object.fromEntries(url.searchParams);
  for (const rule of redirects as Redirect[]) {
    const params = getPathMatch(rule.source, { strict: true, removeUnnamedParams: true })(url.pathname);
    if (!params) continue;
    const has = rule.has ?? [];
    if (
      !has.every(
        (one) => one.type === 'query' && (one.value === undefined ? one.key in query : query[one.key] === one.value),
      )
    ) {
      continue;
    }
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params,
      query,
    });
    const search = new URLSearchParams(parsedDestination.query as Record<string, string>).toString();
    return {
      location: `${parsedDestination.pathname}${search ? `?${search}` : ''}${parsedDestination.hash ?? ''}`,
      status: 'statusCode' in rule && rule.statusCode ? rule.statusCode : rule.permanent ? 308 : 307,
    };
  }
  return null;
}

describe('the old workspace addresses', () => {
  it.each([
    ['/contribute/me', '/my/pull-requests'],
    ['/contribute/me/', '/my/pull-requests'],
    ['/contribute/runs', '/my/agent/runs'],
    ['/contribute/runs?outcome=no_go&range=7d', '/my/agent/runs?outcome=no_go&range=7d'],
    ['/contribute/connect', '/my/agent/key'],
    ['/contribute/connect?path=agent', '/my/agent/connect?path=agent'],
    ['/contribute/connect?path=agent&proof=A_1', '/my/agent/connect?path=agent&proof=A_1'],
    ['/contribute/connect?path=key', '/my/agent/key?path=key'],
    ['/contribute/settings', '/my/settings'],
    ['/contribute/settings?grant=refused', '/my/settings?grant=refused'],
    ['/contribute/settings/work', '/my/settings/work'],
    ['/contribute/settings/switch/stack', '/my/settings/work/switch/stack'],
    ['/contribute/settings/switch/repos/', '/my/settings/work/switch/repos'],
    ['/contribute/settings/budget', '/my/agent/budget'],
    ['/contribute/issues', '/contribute#issues'],
    ['/contribute/issues/', '/contribute#issues'],
    ['/contribute/issues?x=1', '/contribute?x=1#issues'],
    ['/contribute/issues?language=RUST&size=M', '/contribute?language=RUST&size=M#issues'],
    ['/contribute/settings/agent', '/my/agent/model'],
    ['/contribute/settings/keys', '/my/agent/key'],
    ['/contribute/settings/keys?grant=unavailable', '/my/settings/github?grant=unavailable'],
    ['/learn/profile', '/my/settings/goal'],
    ['/contribute/settings/own-agent', '/my/agent'],
    ['/Contribute/Me', '/my/pull-requests'],
    ['/contribute/attempts/A_1', '/my/pull-requests/by-attempt/A_1'],
    ['/contribute/attempts/A_1/', '/my/pull-requests/by-attempt/A_1'],
    ['/contribute/attempts/A_1?session=next', '/my/pull-requests/by-attempt/A_1?session=next'],
    ['/contribute/attempts/A_1?resume=n0nce', '/my/pull-requests/by-attempt/A_1?resume=n0nce'],
    [
      '/contribute/attempts/A_1?move=changes&session=next',
      '/my/pull-requests/by-attempt/A_1?move=changes&session=next',
    ],
    ['/contribute/attempts/A_1/runs/A_F1', '/my/pull-requests/by-attempt/A_F1'],
    ['/contribute/attempts/A_1/runs/A_F1?move=reply-failed', '/my/pull-requests/by-attempt/A_F1?move=reply-failed'],
    ['/learn/attempts/A_1', '/my/pull-requests/by-attempt/A_1'],
    ['/learn/attempts/A_1?resume=n0nce', '/my/pull-requests/by-attempt/A_1?resume=n0nce'],
    ['/learn/lessons', '/my/progress'],
    ['/learn/lessons/', '/my/progress'],
    ['/contribute?start=key', '/contribute/start/agent/key?start=key'],
    ['/contribute?about=1', '/contribute/about?about=1'],
    ['/contribute/?about=1', '/contribute/about?about=1'],
  ])('%s goes on to %s, for now (307)', (from, to) => {
    expect(redirectOf(from)).toEqual({ location: to, status: 307 });
  });

  it('leaves alone the addresses that stay, and the ones other pages still answer', () => {
    for (const address of [
      '/contribute',
      '/contribute?start=other',
      '/contribute/start',
      '/contribute/issues/x',
      '/contribute/attempts',
      '/contribute/attempts/A_1/runs',
      '/contribute/maintainers',
      '/contribute/mcp',
      '/contribute/me/x',
      '/contribute/settings/elsewhere',
      '/learn',
      '/learn/lessons/a-lesson-1x',
      '/learn/lessons/a-lesson-1x/passes/octocat',
      '/learn/start/acme/widgets/42',
      '/my/pull-requests',
    ]) {
      expect(redirectOf(address), address).toBeNull();
    }
  });

  it('sends an agent’s person to the own-agent step, named as the agent’s channel', () => {
    const to = redirectOf('/contribute?start=agent');
    expect(to?.status).toBe(307);
    const url = new URL(to?.location ?? '', 'https://gitranks.com');
    expect(url.pathname).toBe('/contribute/start/agent/own');
    expect(url.searchParams.get('from')).toBe('agent');
    expect(redirectOf('/contribute/?start=agent')?.location).toContain('/contribute/start/agent/own');
  });

  it('lists the row on the query before the plain row of the same path', () => {
    const connect = (redirects as Redirect[]).filter(({ source }) => source.startsWith('/contribute/connect'));
    expect(connect.map(({ has }) => has?.[0]?.key ?? null)).toEqual(['path', null]);
  });
});
