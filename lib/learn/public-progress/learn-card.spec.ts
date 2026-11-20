import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { drawLearnCard } = await import('./learn-card');
const { LEARN_CARD_HEADERS, learnCardResponse } = await import('./learn-card-response');

import type { LearnRecord } from '../learn.types';

const record = (extra: Partial<LearnRecord> = {}): LearnRecord => ({
  login: 'octocat',
  lessons: 7,
  newThings: 19,
  topics: [],
  prsOpened: 3,
  prsMerged: 2,
  reposHelped: 2,
  ...extra,
});

/** A PNG's width and height, from its header. */
const sizeOf = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const respond = (login: string, v: string | null, read: () => Promise<LearnRecord | null>) =>
  learnCardResponse(login, v, read, async () => new Uint8Array([1, 2, 3]));

describe('the Learn progress card', () => {
  it('is drawn at 1200 × 630, a long login and figures at 0 too', async () => {
    expect(sizeOf(await drawLearnCard('octocat', record()))).toEqual({ width: 1200, height: 630 });
    const long = 'a-very-long-github-login-of-39-chars-xy';
    expect(sizeOf(await drawLearnCard(long, record({ login: long, newThings: 0, reposHelped: 0 })))).toEqual({
      width: 1200,
      height: 630,
    });
  }, 30_000);

  it('draws the current numbers, kept an hour in a shared cache and nothing stale after it', async () => {
    const response = await respond('octocat', '7-19-2', async () => record());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('max-age=3600');
    expect(
      `${response.headers.get('Cache-Control')} ${response.headers.get('Cloudflare-CDN-Cache-Control')}`,
    ).not.toMatch(/stale/);
  });

  it('sends a missing, made-up or old `v` to the current address, kept nowhere', async () => {
    for (const v of [null, '', 'x', '7-19-1', '7-19-2-0']) {
      const response = await respond('octocat', v, async () => record());
      expect(response.status, String(v)).toBe(308);
      expect(response.headers.get('Location')).toBe('/badge/user/octocat/learn-card.png?v=7-19-2');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
    }
  });

  it('answers 404 without a record (kept a minute) and for another spelling of the login (kept nowhere)', async () => {
    const none = await respond('octocat', '7-19-2', async () => null);
    expect([none.status, none.headers.get('Cache-Control')]).toEqual([404, 'public, max-age=60']);
    expect(none.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
    const spelled = await respond('OctoCat', '7-19-2', async () => record({ login: 'octocat' }));
    expect([spelled.status, spelled.headers.get('Cache-Control')]).toEqual([404, 'no-store']);
    const notALogin = await respond('-bad-', '7-19-2', async () => record());
    expect(notALogin.status).toBe(404);
  });

  it('answers a short unavailable when the record cannot be read or drawn: never a card with zeros', async () => {
    const failed = await respond('octocat', '7-19-2', async () => {
      throw new Error('down');
    });
    expect(failed.status).toBe(503);
    expect(failed.headers.get('Cache-Control')).toBe(LEARN_CARD_HEADERS.unavailable['Cache-Control']);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = await learnCardResponse(
      'octocat',
      '7-19-2',
      async () => record(),
      async () => {
        throw new Error('satori');
      },
    );
    expect(broken.status).toBe(503);
  });
});
