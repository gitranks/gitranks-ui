import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { drawFixCard, fixCardResponse } = await import('./fix-card-response');
const { FixShareCard } = await import('./fix-cards');

import { longFix, mergedFix, noLessonFix, openFix } from '@/lib/learn/__fixtures__/fix-share';
import { fixCardUrlOf, type LearnFixCard } from '@/lib/learn/fix-share-card';

const LONG_DASH = String.fromCodePoint(0x2014);
const PR = { nameWithOwner: 'harbor-kit/relay', number: 436 };
const PATH = '/contribute/pr/harbor-kit/relay/436/card.png';

const reading =
  (fix: LearnFixCard | null, extra: { failed?: boolean; learnOpen?: boolean } = {}) =>
  async () => ({ fix, failed: false, learnOpen: true, ...extra });
const png = async () => new Uint8Array([1, 2, 3]);
const versionOf = (fix: LearnFixCard, learnOpen = true) => {
  const url = fixCardUrlOf(fix, learnOpen);
  return url.slice(url.indexOf('?'));
};

/** A PNG's width and height, from its header. */
const sizeOf = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

describe("a fix's picture", () => {
  it('draws a merged fix: the project and the issue, the title, who fixed it with which agent, the lesson', () => {
    const html = text(renderToStaticMarkup(<FixShareCard fix={mergedFix} learnOpen />));
    expect(html).toBe(
      'gitranks FIX MERGED harbor-kit/relay #431 The retry list grows without limit when a webhook keeps failing ' +
        'Fixed by @octocat with Claude Code Merged on 20 Nov 2026 · Uses the lesson Bound every retry ' +
        'gitranks.com/contribute/pr/harbor-kit/relay/436',
    );
    expect(html).not.toContain(LONG_DASH);
  });

  it('names no lesson while Learn is not open to everyone, nor for a fix without one', () => {
    for (const html of [
      text(renderToStaticMarkup(<FixShareCard fix={mergedFix} learnOpen={false} />)),
      text(renderToStaticMarkup(<FixShareCard fix={noLessonFix} learnOpen />)),
    ]) {
      expect(html).toMatch(/Merged on \d+ \w+ 2026 gitranks\.com/);
      expect(html).not.toContain('lesson');
    }
  });

  it('draws an open pull request waiting for review, and a fixer whose agent never said', () => {
    const html = text(renderToStaticMarkup(<FixShareCard fix={{ ...openFix, agent: null }} learnOpen />));
    expect(html).toContain('PULL REQUEST OPEN gin-gonic/gin #3921 A slow client could hold a worker forever');
    expect(html).toContain('Fixed by @octocat Waiting for the project’s review');
    expect(html).not.toContain('Set a deadline');
  });

  it('is drawn at 1200 × 630, a long title and long names too', async () => {
    expect(sizeOf(await drawFixCard(mergedFix, true))).toEqual({ width: 1200, height: 630 });
    expect(sizeOf(await drawFixCard(longFix, true))).toEqual({ width: 1200, height: 630 });
  }, 30_000);

  it('draws a merged or open fix under its own address and version, kept no longer than its page', async () => {
    const response = await fixCardResponse(PR, PATH, versionOf(mergedFix), reading(mergedFix), png);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    // As the page's Markdown copy: a minute in a browser, two in a shared cache, and no longer anywhere.
    expect([...response.headers.keys()].sort()).toEqual(['cache-control', 'content-type']);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=120');
    const open = await fixCardResponse(
      { nameWithOwner: 'gin-gonic/gin', number: 3925 },
      '/contribute/pr/gin-gonic/gin/3925/card.png',
      versionOf(openFix),
      reading(openFix),
      png,
    );
    expect(open.status).toBe(200);
  });

  it("sends any other query, another spelling of the project, or Learn's other state to its current address", async () => {
    const url = fixCardUrlOf(mergedFix, true);
    for (const [path, search] of [
      [PATH, ''],
      [PATH, '?v=x'],
      [PATH, `${versionOf(mergedFix)}&x=1`],
      [PATH, versionOf(mergedFix, false)],
      ['/contribute/pr/Harbor-Kit/Relay/436/card.png', versionOf(mergedFix)],
    ]) {
      const response = await fixCardResponse(PR, path, search, reading(mergedFix), png);
      expect(response.status, `${path}${search}`).toBe(308);
      expect(response.headers.get('location')).toBe(url);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('is not found for no public page, a closed pull request and an address no pull request has', async () => {
    for (const [pr, read] of [
      [PR, reading(null)],
      [PR, reading({ ...mergedFix, state: 'CLOSED' })],
      [null, reading(mergedFix)],
    ] as const) {
      const response = await fixCardResponse(pr, PATH, versionOf(mergedFix), read, png);
      expect([response.status, response.headers.get('cache-control')]).toEqual([404, 'private, no-store']);
    }
  });

  it('answers 503 for a minute when the fix or the drawing fails, never a broken picture', async () => {
    const failed = await fixCardResponse(PR, PATH, '?v=x', reading(null, { failed: true }), png);
    expect([failed.status, failed.headers.get('retry-after')]).toEqual([503, '60']);
    const thrown = await fixCardResponse(
      PR,
      PATH,
      '?v=x',
      async () => {
        throw new Error('down');
      },
      png,
    );
    expect(thrown.status).toBe(503);
    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    const broken = await fixCardResponse(PR, PATH, versionOf(mergedFix), reading(mergedFix), async () => {
      throw new Error('no font');
    });
    expect(broken.status).toBe(503);
  });
});
