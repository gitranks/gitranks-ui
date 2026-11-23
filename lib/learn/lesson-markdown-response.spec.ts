import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { setLesson } from './__fixtures__/lesson-page';
import { learnLessonMarkdownOf } from './lesson-markdown';
import { lessonMarkdownResponse } from './lesson-markdown-response';

describe("a lesson's Markdown copy, answered", () => {
  it('is the copy of a live lesson, kept a minute, never indexed, its page named as the canonical', async () => {
    const response = await lessonMarkdownResponse(setLesson.slug, async () => ({ kind: 'live', lesson: setLesson }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(learnLessonMarkdownOf(setLesson));
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      link: '</learn/lessons/find-duplicates-with-a-set>; rel="canonical"',
    });
  });

  it('answers as the page does, with nothing of the lesson: paused 503, removed 410, missing 404', async () => {
    for (const [kind, status] of [
      ['paused', 503],
      ['removed', 410],
      ['missing', 404],
    ] as const) {
      const response = await lessonMarkdownResponse('sets', async () => ({ kind }));
      expect(response.status, kind).toBe(status);
      expect(response.headers.get('content-type'), kind).toBe('text/plain; charset=utf-8');
      expect(await response.text(), kind).not.toContain('#');
    }
  });

  it("sends a moved lesson's copy to the new lesson's copy", async () => {
    const response = await lessonMarkdownResponse('sets', async () => ({ kind: 'moved', slug: 'sets-2' }));
    expect([response.status, response.headers.get('location')]).toEqual([308, '/learn/lessons/sets-2.md']);
  });

  it('asks again in a minute when the lesson could not be read', async () => {
    const response = await lessonMarkdownResponse('sets', async () => Promise.reject(new Error('down')));
    expect([response.status, response.headers.get('retry-after')]).toEqual([503, '60']);
  });
});
