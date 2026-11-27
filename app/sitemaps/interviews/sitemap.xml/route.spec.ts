import { beforeEach, describe, expect, it, vi } from 'vitest';

import { interviewsHome } from '@/lib/interviews/__fixtures__/companies';

const { loadInterviewsHome, parts } = vi.hoisted(() => ({
  loadInterviewsHome: vi.fn(),
  parts: { INTERVIEWS_OPEN_TO_EVERYONE: false },
}));
vi.mock('server-only', () => ({}));
vi.mock('next/server', async (actual) => ({ ...(await actual<object>()), connection: vi.fn(async () => {}) }));
vi.mock('@/lib/interviews/home.data', () => ({ loadInterviewsHome }));
vi.mock('@/lib/interviews/interviews-parts', async (actual) => ({
  ...(await actual<object>()),
  get INTERVIEWS_OPEN_TO_EVERYONE() {
    return parts.INTERVIEWS_OPEN_TO_EVERYONE;
  },
}));

const { GET } = await import('./route');

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  loadInterviewsHome.mockReset().mockResolvedValue(interviewsHome);
});

describe('/sitemaps/interviews/sitemap.xml', () => {
  it('does not exist while Interviews is not open to everyone, as before, and reads nothing', async () => {
    parts.INTERVIEWS_OPEN_TO_EVERYONE = false;
    const response = await GET();
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(loadInterviewsHome).not.toHaveBeenCalled();
  });

  it("lists Interviews' public pages once open, as a sitemap file", async () => {
    parts.INTERVIEWS_OPEN_TO_EVERYONE = true;
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    const xml = await response.text();
    expect(xml).toMatch(
      /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">\n/,
    );
    expect(xml).toContain(
      '<url>\n<loc>https://example.test/interviews</loc>\n<changefreq>monthly</changefreq>\n<priority>0.7</priority>\n</url>',
    );
    expect(xml).toContain('<loc>https://example.test/interviews/tallgrass/site-reliability-engineer</loc>');
    expect(xml.endsWith('</urlset>\n')).toBe(true);
  });
});
