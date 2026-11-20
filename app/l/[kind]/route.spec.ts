import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FOLLOW_TOKEN, MANAGE_TOKEN } from '@/lib/link-token/__fixtures__/follow-links';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { GET } = await import('./route');

const land = (kind: string, query: string) =>
  GET(new NextRequest(`https://gitranks.com/l/${kind}${query}`), { params: Promise.resolve({ kind }) });

describe('/l/<kind>, where a link in our email lands', () => {
  beforeEach(() => graphqlDirect.mockClear());

  it.each([
    ['unfollow', FOLLOW_TOKEN, '/follow/unfollow'],
    ['settings', MANAGE_TOKEN, '/following'],
  ])(
    '%s: keeps the token in an HttpOnly cookie and sends the browser to its page, with no token in the address',
    async (kind, token, page) => {
      const response = await land(kind, `?t=${token}&utm_source=follow`);

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(page);
      expect(response.headers.get('location')).not.toContain(token);
      const cookie = response.headers.get('set-cookie') ?? '';
      expect(cookie).toContain(`gitranks-link-${kind}=${token}`);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Max-Age=900/);
    },
  );

  it('no longer lands a confirmation link: those emails are not sent any more', async () => {
    expect((await land('confirm', `?t=${FOLLOW_TOKEN}`)).status).toBe(404);
  });

  it('is never indexed, cached or passed on in a Referer', async () => {
    const response = await land('unfollow', `?t=${FOLLOW_TOKEN}`);
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('changes nothing: a landing asks the API nothing', async () => {
    await land('unfollow', `?t=${FOLLOW_TOKEN}`);
    await land('settings', `?t=${MANAGE_TOKEN}`);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("without a usable token, clears the kind's cookie and says why in ?e=invalid, with nothing of the token", async () => {
    for (const query of ['', '?t=short', `?t=${FOLLOW_TOKEN}%20x`, `?t=${FOLLOW_TOKEN.slice(0, 31)}`]) {
      const response = await land('unfollow', query);
      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/follow/unfollow?e=invalid');
      expect(response.headers.get('set-cookie')).toMatch(/gitranks-link-unfollow=;.*Max-Age=0/i);
    }
  });

  it('answers 404 for a kind it does not have, and keeps nothing', async () => {
    const response = await land('elsewhere', `?t=${FOLLOW_TOKEN}`);
    expect(response.status).toBe(404);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });
});
