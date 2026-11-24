import { beforeEach, describe, expect, it, vi } from 'vitest';

import { learnSitemapEntries } from './learn-sitemap';

describe('the Learn sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  const link = (slug: string) => ({ slug, title: slug });
  const CONTENT = {
    courses: [{ slug: 'algorithms' }, { slug: 'go' }],
    lessons: [
      { slug: 'sets', course: link('algorithms'), paused: false, changedAt: '2026-11-10T10:00:00.000Z' },
      { slug: 'hash-maps', course: link('algorithms'), paused: false, changedAt: '2026-11-12T10:00:00.000Z' },
      { slug: 'heaps', course: link('algorithms'), paused: true, changedAt: '2026-11-20T10:00:00.000Z' },
      { slug: 'go-variables', course: link('go'), paused: false, changedAt: '2026-11-11T10:00:00.000Z' },
    ],
  };

  it('lists the landing, the courses and their live lessons, each at its last change', () => {
    const entries = learnSitemapEntries({ content: CONTENT });
    expect(entries.map((entry) => [entry.url, entry.lastModified])).toEqual([
      ['https://example.test/learn', undefined],
      ['https://example.test/learn/courses', '2026-11-12T10:00:00.000Z'],
      ['https://example.test/learn/courses/algorithms', '2026-11-12T10:00:00.000Z'],
      ['https://example.test/learn/courses/go', '2026-11-11T10:00:00.000Z'],
      ['https://example.test/learn/lessons/sets', '2026-11-10T10:00:00.000Z'],
      ['https://example.test/learn/lessons/hash-maps', '2026-11-12T10:00:00.000Z'],
      ['https://example.test/learn/lessons/go-variables', '2026-11-11T10:00:00.000Z'],
    ]);
  });

  it('lists no old address: the page for maintainers is Contribute’s, and a fix’s pages are not here', () => {
    const urls = learnSitemapEntries({ content: CONTENT }).map((entry) => entry.url);
    for (const old of ['/learn/maintainers', '/learn/earlier', '/learn/start', '/passes/']) {
      expect(
        urls.some((url) => url.includes(old)),
        old,
      ).toBe(false);
    }
  });

  it('lists a course with no live lesson without a day, and the landing alone when the courses could not be read', () => {
    const paused = { courses: [{ slug: 'algorithms' }], lessons: [{ ...CONTENT.lessons[2] }] };
    expect(learnSitemapEntries({ content: paused }).map((entry) => [entry.url, entry.lastModified])).toEqual([
      ['https://example.test/learn', undefined],
      ['https://example.test/learn/courses', undefined],
      ['https://example.test/learn/courses/algorithms', undefined],
    ]);
    expect(learnSitemapEntries({ content: null }).map((entry) => entry.url)).toEqual(['https://example.test/learn']);
    expect(learnSitemapEntries().map((entry) => entry.url)).toEqual(['https://example.test/learn']);
  });
});
