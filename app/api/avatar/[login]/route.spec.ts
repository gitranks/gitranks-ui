import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const fetchMock = vi.fn();

const get = (login: string) =>
  GET(new NextRequest(`https://example.test/api/avatar/${encodeURIComponent(login)}`), {
    params: Promise.resolve({ login }),
  });

const fetchedUrl = () => String(fetchMock.mock.calls[0]?.[0]);

describe('avatar route', () => {
  beforeEach(() => {
    vi.mocked(graphqlDirect).mockReset();
    fetchMock.mockReset().mockResolvedValue(new Response('png', { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves a developer's stored avatar at twice the size pages draw it, cached", async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({
      user: { avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' },
      organization: null,
    });

    const response = await get('torvalds');

    expect(response.status).toBe(200);
    expect(fetchedUrl()).toBe('https://avatars.githubusercontent.com/u/1?v=4&s=576');
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
  });

  it("serves an organization's stored avatar", async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({
      user: null,
      organization: { avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4' },
    });

    expect((await get('vercel')).status).toBe(200);
    expect(fetchedUrl()).toBe('https://avatars.githubusercontent.com/u/2?v=4&s=576');
  });

  it("falls back to GitHub's avatar link for an account GitRanks has not read, or when the read fails", async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({ user: null, organization: null });
    expect((await get('some-owner')).status).toBe(200);
    expect(fetchedUrl()).toBe('https://github.com/some-owner.png?size=576');

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockClear();
    vi.mocked(graphqlDirect).mockRejectedValue(new Error('down'));
    expect((await get('some-owner')).status).toBe(200);
    expect(fetchedUrl()).toBe('https://github.com/some-owner.png?size=576');
    error.mockRestore();
  });

  it('answers 404, cached, for a login GitHub would not take, without reaching GitHub', async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({ user: null, organization: null });

    for (const login of ['-bad', 'a--b', 'a/../b', 'evil.com', 'x'.repeat(40), 'a@b']) {
      const response = await get(login);

      expect(response.status, login).toBe(404);
      expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still serves an old login that breaks the rules when its avatar is stored', async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({
      user: { avatarUrl: 'https://avatars.githubusercontent.com/u/3?v=4' },
      organization: null,
    });

    expect((await get('old-')).status).toBe(200);
  });

  it('answers 404 when GitHub has no avatar', async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({ user: null, organization: null });
    fetchMock.mockResolvedValue(new Response('no', { status: 404 }));

    expect((await get('ghost-owner')).status).toBe(404);
  });
});
