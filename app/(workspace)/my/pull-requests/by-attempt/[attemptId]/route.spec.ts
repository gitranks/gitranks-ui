import { describe, expect, it, vi } from 'vitest';

const { read } = vi.hoisted(() => ({
  read: vi.fn(async (_id: string) => ({ attemptId: 'A_1', kind: 'FIRST', mode: 'FIX', followUpOf: null }) as never),
}));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadAttemptRef: read }));
vi.mock('@/lib/seo/site', () => ({ SITE_URL: 'https://gitranks.com' }));

const { GET } = await import('./route');

// As behind the proxy: the request URL is the server's bind address, never the site's.
const call = (attemptId: string, query = '') =>
  GET(new Request(`https://0.0.0.0:3000/my/pull-requests/by-attempt/${attemptId}${query}`), {
    params: Promise.resolve({ attemptId }),
  } as never);

describe('the address by attempt', () => {
  it("answers a 307 nobody keeps, on the site's own address, the query kept", async () => {
    const answer = await call('A_1', '?session=next&move=changes');
    expect(answer.status).toBe(307);
    expect(answer.headers.get('location')).toBe(
      'https://gitranks.com/contribute/attempts/A_1?session=next&move=changes',
    );
    expect(answer.headers.get('cache-control')).toBe('private, no-store');
  });
});
