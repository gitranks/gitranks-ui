import { describe, expect, it, vi } from 'vitest';

const { target } = vi.hoisted(() => ({ target: vi.fn(async (_id: string) => '/contribute/pr/a/b/1') }));
vi.mock('@/lib/contribute/pr-timeline-gate', () => ({ prTimelineShortTargetOf: target }));
vi.mock('@/lib/seo/site', () => ({ SITE_URL: 'https://gitranks.com' }));

const { GET } = await import('./route');

// As behind the proxy: the request URL is the server's bind address, never the site's.
const call = (owner: string) =>
  GET(new Request(`https://0.0.0.0:3000/contribute/pr/${owner}`), {
    params: Promise.resolve({ owner }),
  } as never);

describe('the short address', () => {
  it('always answers a 307 nobody keeps: the page, or the maintainers page', async () => {
    const shown = await call('6728f0c2a1b2c3d4e5f60718');
    expect(shown.status).toBe(307);
    expect(shown.headers.get('location')).toBe('https://gitranks.com/contribute/pr/a/b/1');
    expect(shown.headers.get('cache-control')).toBe('private, no-store');
    target.mockResolvedValueOnce('/contribute/maintainers?from=6728f0c2a1b2c3d4e5f60718');
    const hidden = await call('6728f0c2a1b2c3d4e5f60718');
    expect(hidden.status).toBe(307);
    expect(hidden.headers.get('location')).toBe(
      'https://gitranks.com/contribute/maintainers?from=6728f0c2a1b2c3d4e5f60718',
    );
  });

  it('is a 404 for anything that is not an id', async () => {
    expect((await call('acme')).status).toBe(404);
    expect((await call('6728F0C2A1B2C3D4E5F60718')).status).toBe(404);
  });
});
