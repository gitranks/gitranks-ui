import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { drawLessonCard, LESSON_CARD_HEADERS, lessonCardResponse } = await import('./lesson-card');
const { longTitleLesson } = await import('./__fixtures__/lesson-share');
const { regexLesson, setLesson } = await import('./__fixtures__/lesson-page');

/** A PNG's width and height, from its header. */
const sizeOf = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const VERSION = '?v=mvhvstc0';
const live = async () => ({ kind: 'live' as const, lesson: setLesson });
const drawn = async () => new Uint8Array([1, 2, 3]);

describe("a lesson's pictures", () => {
  it('are drawn at 1200 × 630: the lesson, its fact, a long title and a long fact', async () => {
    const cards = {
      lesson: await drawLessonCard('lesson', setLesson),
      fact: await drawLessonCard('fact', setLesson),
      'long-title': await drawLessonCard('lesson', longTitleLesson),
      'long-fact': await drawLessonCard('fact', regexLesson),
    };
    for (const [name, png] of Object.entries(cards)) {
      expect(sizeOf(png), name).toEqual({ width: 1200, height: 630 });
    }
  }, 30_000);

  it("draws a live lesson's picture under its version, kept five minutes in a browser and ten in a shared cache", async () => {
    expect(VERSION).toBe(`?v=${Date.parse(setLesson.changedAt).toString(36)}`);
    const response = await lessonCardResponse('lesson', setLesson.slug, VERSION, live, drawn);
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': LESSON_CARD_HEADERS['Content-Type'],
      'cache-control': 'public, max-age=300',
      'cloudflare-cdn-cache-control': 'max-age=600',
    });
  });

  it('sends any other query to the current address, kept nowhere, so no query draws it again', async () => {
    for (const search of ['', '?v=', '?v=old', `${VERSION}&x=1`, '?x=1']) {
      for (const kind of ['lesson', 'fact'] as const) {
        const response = await lessonCardResponse(kind, setLesson.slug, search, live, drawn);
        expect(response.status, search).toBe(308);
        expect(response.headers.get('location')).toBe(
          `/learn/lessons/${setLesson.slug}/${kind === 'lesson' ? 'card' : 'fact'}.png${VERSION}`,
        );
        expect(response.headers.get('cache-control')).toBe('private, no-store');
      }
    }
  });

  it("follows the page's gate: paused 503, removed 410, moved to the new lesson's picture, missing 404", async () => {
    const paused = await lessonCardResponse('lesson', 'sets', VERSION, async () => ({ kind: 'paused' }), drawn);
    expect([paused.status, paused.headers.get('retry-after')]).toEqual([503, '3600']);
    const removed = await lessonCardResponse('fact', 'sets', VERSION, async () => ({ kind: 'removed' }), drawn);
    expect(removed.status).toBe(410);
    const moved = await lessonCardResponse(
      'fact',
      'sets',
      VERSION,
      async () => ({ kind: 'moved', slug: 'sets-2' }),
      drawn,
    );
    expect([moved.status, moved.headers.get('location')]).toEqual([308, '/learn/lessons/sets-2/fact.png']);
    const missing = await lessonCardResponse('lesson', 'sets', VERSION, async () => ({ kind: 'missing' }), drawn);
    expect(missing.status).toBe(404);
    for (const response of [paused, removed, moved, missing]) {
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('content-type')).not.toBe('image/png');
    }
  });

  it('has no fact picture for a lesson with no fact', async () => {
    const plain = async () => ({ kind: 'live' as const, lesson: { ...setLesson, fact: null } });
    expect((await lessonCardResponse('fact', setLesson.slug, VERSION, plain, drawn)).status).toBe(404);
  });

  it('answers 503 for a while when the lesson or the drawing fails, never a broken picture', async () => {
    const failed = await lessonCardResponse('lesson', 'sets', VERSION, async () => Promise.reject(new Error('down')));
    expect([failed.status, failed.headers.get('retry-after')]).toEqual([503, '60']);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = await lessonCardResponse('lesson', setLesson.slug, VERSION, live, async () => {
      throw new Error('font');
    });
    expect(broken.status).toBe(503);
  });
});
