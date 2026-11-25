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

  describe('the views in real projects', () => {
    const fixes = (slug: string, course: string, fixesListed: boolean | null, paused = false) => ({
      slug,
      course: { slug: course },
      paused,
      fixesListed,
    });
    const real = (listed: Parameters<typeof learnSitemapEntries>[0]) =>
      learnSitemapEntries(listed)
        .filter((entry) => entry.url.endsWith('/real-world'))
        .map((entry) => [entry.url, entry.priority]);

    it("lists a live lesson's view with a listed merged fix, and its course's", () => {
      expect(
        real({
          content: CONTENT,
          listed: [fixes('sets', 'algorithms', true), fixes('hash-maps', 'algorithms', false)],
        }),
      ).toEqual([
        ['https://example.test/learn/courses/algorithms/real-world', 0.5],
        ['https://example.test/learn/lessons/sets/real-world', 0.5],
      ]);
    });

    it('lists none for a lesson with no listed fix, a paused one, one not known, or one the sitemap leaves out', () => {
      expect(
        real({
          content: CONTENT,
          listed: [
            fixes('hash-maps', 'algorithms', false),
            fixes('heaps', 'algorithms', true, true),
            fixes('go-variables', 'go', null),
            fixes('elsewhere', 'go', true),
          ],
        }),
      ).toEqual([]);
    });

    it("lists no project course's view, and none when the fixes or the courses could not be read", () => {
      const project = {
        courses: [{ slug: 'django', project: { kind: 'REPOSITORY', name: 'django/django' } }],
        lessons: [
          { slug: 'orm-queries', course: link('django'), paused: false, changedAt: '2026-11-10T10:00:00.000Z' },
        ],
      } as unknown as NonNullable<Parameters<typeof learnSitemapEntries>[0]>['content'];
      expect(real({ content: project, listed: [fixes('orm-queries', 'django', true)] })).toEqual([
        ['https://example.test/learn/lessons/orm-queries/real-world', 0.5],
      ]);
      expect(real({ content: CONTENT, listed: null })).toEqual([]);
      expect(real({ content: null, listed: [fixes('sets', 'algorithms', true)] })).toEqual([]);
    });
  });
});
