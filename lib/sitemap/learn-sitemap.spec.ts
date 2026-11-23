import { beforeEach, describe, expect, it, vi } from 'vitest';

import { learnSitemapEntries } from './learn-sitemap';

const LESSON = {
  slug: 'route-cache-miss-8f3kab',
  title: 'Route cache miss',
  language: 'TypeScript',
  repo: 'o/n',
  publishedAt: '2026-11-14T10:00:00.000Z',
  modifiedAt: '2026-11-15T10:00:00.000Z',
};

describe('the Learn sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  it('lists the page for maintainers and every public lesson at its last change, never a result page', () => {
    const entries = learnSitemapEntries([LESSON], { frontDoorOpen: false });
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://example.test/learn/maintainers',
      'https://example.test/learn/lessons/route-cache-miss-8f3kab',
    ]);
    expect(entries[1]).toMatchObject({ lastModified: LESSON.modifiedAt, priority: 0.6 });
  });

  it('lists the front door once it is open to visitors', () => {
    expect(learnSitemapEntries([], { frontDoorOpen: true }).map((entry) => entry.url)).toEqual([
      'https://example.test/learn',
      'https://example.test/learn/maintainers',
    ]);
  });

  const link = (slug: string) => ({ slug, title: slug });
  const CONTENT = {
    courses: [{ slug: 'algorithms' }, { slug: 'go' }],
    lessons: [
      { slug: 'sets', course: link('algorithms'), paused: false, changedAt: '2026-11-10T10:00:00.000Z' },
      { slug: 'hash-maps', course: link('algorithms'), paused: false, changedAt: '2026-11-12T10:00:00.000Z' },
      { slug: 'heaps', course: link('algorithms'), paused: true, changedAt: '2026-11-20T10:00:00.000Z' },
      { slug: 'route-cache-miss-8f3kab', course: link('go'), paused: false, changedAt: '2026-11-11T10:00:00.000Z' },
    ],
  };

  it('lists the courses and their live lessons, each at its last change, while Learn is open to everyone', () => {
    const entries = learnSitemapEntries([LESSON], { frontDoorOpen: true, content: CONTENT });
    expect(entries.map((entry) => [entry.url, entry.lastModified])).toEqual([
      ['https://example.test/learn', undefined],
      ['https://example.test/learn/courses', '2026-11-12T10:00:00.000Z'],
      ['https://example.test/learn/courses/algorithms', '2026-11-12T10:00:00.000Z'],
      ['https://example.test/learn/courses/go', '2026-11-11T10:00:00.000Z'],
      ['https://example.test/learn/lessons/sets', '2026-11-10T10:00:00.000Z'],
      ['https://example.test/learn/lessons/hash-maps', '2026-11-12T10:00:00.000Z'],
      // A lesson of a course at the same address as a public lesson of a fix is listed once.
      ['https://example.test/learn/lessons/route-cache-miss-8f3kab', '2026-11-11T10:00:00.000Z'],
      ['https://example.test/learn/maintainers', undefined],
    ]);
  });

  it('lists no course, no lesson of a course and no landing while Learn is closed, whatever it is given', () => {
    const urls = learnSitemapEntries([], { frontDoorOpen: false, content: CONTENT }).map((entry) => entry.url);
    expect(urls).toEqual(['https://example.test/learn/maintainers']);
  });

  it('lists a course with no live lesson without a day, and the landing when the courses could not be read', () => {
    const paused = { courses: [{ slug: 'algorithms' }], lessons: [{ ...CONTENT.lessons[2] }] };
    const entries = learnSitemapEntries([], { frontDoorOpen: true, content: paused });
    expect(entries.map((entry) => [entry.url, entry.lastModified])).toEqual([
      ['https://example.test/learn', undefined],
      ['https://example.test/learn/courses', undefined],
      ['https://example.test/learn/courses/algorithms', undefined],
      ['https://example.test/learn/maintainers', undefined],
    ]);
    expect(learnSitemapEntries([], { frontDoorOpen: true, content: null }).map((entry) => entry.url)).toEqual([
      'https://example.test/learn',
      'https://example.test/learn/maintainers',
    ]);
  });
});
