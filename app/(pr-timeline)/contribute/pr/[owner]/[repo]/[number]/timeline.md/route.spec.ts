import { describe, expect, it, vi } from 'vitest';

import { mergedTimeline } from '@/lib/contribute/__fixtures__/pr-timeline';

const { read } = vi.hoisted(() => ({ read: vi.fn(async (_pr: unknown): Promise<unknown> => null) }));
vi.mock('@/lib/contribute/pr-timeline.data', () => ({ publicPrTimeline: read }));

const { GET } = await import('./route');

const call = (owner: string, repo: string, number: string) =>
  GET(new Request(`https://gitranks.com/contribute/pr/${owner}/${repo}/${number}/timeline.md`), {
    params: Promise.resolve({ owner, repo, number }),
  } as never);

describe('the Markdown twin', () => {
  it('answers the shown page as Markdown, kept by shared caches, a partial one a minute', async () => {
    read.mockResolvedValueOnce(mergedTimeline);
    const shown = await call('driftwood-js', 'driftwood', '1419');
    expect(shown.status).toBe(200);
    expect(shown.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(shown.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=120');
    expect(await shown.text()).toContain('# Normalize route paths');
    read.mockResolvedValueOnce({ ...mergedTimeline, partial: true });
    expect((await call('driftwood-js', 'driftwood', '1419')).headers.get('cache-control')).toBe(
      'public, max-age=60, s-maxage=60',
    );
  });

  it('is a 404 nobody keeps for anything else', async () => {
    const missing = await call('acme', 'widgets', '1');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('private, no-store');
    expect((await call('acme', 'widgets', '01')).status).toBe(404);
  });
});
