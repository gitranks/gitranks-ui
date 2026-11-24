import { describe, expect, it, vi } from 'vitest';

import { contributeFix, learnFix, learnFixClosed, learnFixHeld, learnFixOpen } from '@/lib/learn/__fixtures__/fix-page';
import { mergedTimeline } from '@/lib/workspace/__fixtures__/pr-timeline';

const { read, fix } = vi.hoisted(() => ({
  read: vi.fn(async (_pr: unknown): Promise<unknown> => null),
  fix: vi.fn(async (_pr: unknown): Promise<unknown> => null),
}));
vi.mock('@/lib/workspace/pr-timeline.data', () => ({ publicPrTimeline: read }));
vi.mock('@/lib/learn/fix-page.data', () => ({ loadFixPage: fix }));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

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

  it('is one copy for both views of a Learn fix: its Learn part, and "Learn from it" as the canonical', async () => {
    read.mockResolvedValue(mergedTimeline);
    fix.mockResolvedValueOnce(learnFix);
    const learn = await call('driftwood-js', 'driftwood', '1419');
    const text = await learn.text();
    expect(text).toContain('was made with GitRanks Learn.');
    expect(text).toContain('## Learn from it');
    expect(text).toContain('[Learn from it](https://gitranks.com/learn/fixes/driftwood-js/driftwood/1419)');
    expect(text).toContain('4 questions about the change, passed by 12 people. mira-dev answered them');
    expect(text).toContain('[The lesson: Normalize a key before you look it up]');
    expect(text.indexOf('## Learn from it')).toBeLessThan(text.indexOf('## Links'));
    expect(learn.headers.get('link')).toBe('</learn/fixes/driftwood-js/driftwood/1419>; rel="canonical"');
    // Closed without a merge: the Learn part with no "Learn from it", this page the canonical.
    fix.mockResolvedValueOnce(learnFixClosed);
    const closed = await call('driftwood-js', 'driftwood', '1419');
    expect(await closed.text()).not.toContain('[Learn from it]');
    expect(closed.headers.get('link')).toBe('</contribute/pr/driftwood-js/driftwood/1419>; rel="canonical"');
    // Open: listed in the sitemap at "How it was made", which stays its canonical until it merges.
    fix.mockResolvedValueOnce(learnFixOpen);
    const open = await call('driftwood-js', 'driftwood', '1419');
    expect(await open.text()).toContain(
      '[Learn from it](https://gitranks.com/learn/fixes/driftwood-js/driftwood/1419)',
    );
    expect(open.headers.get('link')).toBe('</contribute/pr/driftwood-js/driftwood/1419>; rel="canonical"');
    // Made with Contribute, or no fix read: the copy as before.
    for (const other of [contributeFix, null]) {
      fix.mockResolvedValueOnce(other);
      const page = await (await call('driftwood-js', 'driftwood', '1419')).text();
      expect(page).toContain('was made with GitRanks Contribute.');
      expect(page).not.toContain('## Learn from it');
    }
  });

  it('names Learn for a Learn fix with no Learn part to add, and never a long dash', async () => {
    read.mockResolvedValue(mergedTimeline);
    fix.mockResolvedValueOnce({ ...learnFixHeld, state: 'CLOSED', lesson: null });
    const text = await (await call('driftwood-js', 'driftwood', '1419')).text();
    expect(text).toContain('was made with GitRanks Learn.');
    expect(text).not.toContain('## Learn from it');
    expect(text).not.toContain('—');
  });

  it('throws a failed fix read, so no cache keeps a copy that names the wrong product', async () => {
    read.mockResolvedValue(mergedTimeline);
    fix.mockRejectedValueOnce(new Error('socket hang up'));
    await expect(call('driftwood-js', 'driftwood', '1419')).rejects.toThrow('socket hang up');
  });
});
