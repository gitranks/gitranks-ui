import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/social-card/social-card', () => ({ drawSocialCard: vi.fn() }));

import { algorithmsCourse, courseCards } from './__fixtures__/course';
import { courseMarkdownResponse, coursesMarkdownResponse } from './course-markdown-response';
import { type CourseShareState, courseShareStateOf } from './course-share';
import { courseCardVersionOf, coursesCardVersionOf } from './course-share-card';
import { courseCardResponse, coursesCardResponse } from '@/components/learn/share/course-card-response';

const LONG_DASH = String.fromCodePoint(0x2014);
const live: CourseShareState = { kind: 'live', course: algorithmsCourse };
const read = (course: typeof algorithmsCourse | null, address: { state: string; movedTo: string | null } | null) => ({
  course: vi.fn(async () => course),
  address: vi.fn(async () => address as never),
});

describe("a course's state for its copy and its picture", () => {
  it('reads the course first, and its address only when it is not live', async () => {
    const live = read(algorithmsCourse, null);
    expect(await courseShareStateOf('algorithms', live)).toEqual({ kind: 'live', course: algorithmsCourse });
    expect(live.address).not.toHaveBeenCalled();
    const cases: [{ state: string; movedTo: string | null } | null, CourseShareState][] = [
      [{ state: 'PAUSED', movedTo: null }, { kind: 'paused' }],
      [{ state: 'REMOVED', movedTo: null }, { kind: 'removed' }],
      [
        { state: 'MOVED', movedTo: 'algorithms-and-data' },
        { kind: 'moved', slug: 'algorithms-and-data' },
      ],
      [{ state: 'MOVED', movedTo: 'Not A Slug' }, { kind: 'missing' }],
      [{ state: 'MISSING', movedTo: null }, { kind: 'missing' }],
      // Live by its address, yet not readable: a moment between two deploys.
      [{ state: 'LIVE', movedTo: null }, { kind: 'missing' }],
      [null, { kind: 'missing' }],
    ];
    for (const [address, state] of cases) {
      expect(await courseShareStateOf('algorithms', read(null, address)), JSON.stringify(address)).toEqual(state);
    }
  });

  it('asks nothing for a slug of another shape', async () => {
    const asked = read(algorithmsCourse, null);
    expect(await courseShareStateOf('_gone', asked)).toEqual({ kind: 'missing' });
    expect(asked.course).not.toHaveBeenCalled();
  });
});

describe("a course's Markdown copy and that of all courses", () => {
  it('serves a live course as Markdown, with its page as the canonical, never indexed', async () => {
    const res = await courseMarkdownResponse('algorithms', async () => live);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(res.headers.get('link')).toBe('</learn/courses/algorithms>; rel="canonical"');
    expect(await res.text()).toMatch(/^# Algorithms and data structures\n/);
  });

  it('answers a paused course 503, a removed one 410, a moved one with its new copy, kept nowhere', async () => {
    const paused = await courseMarkdownResponse('algorithms', async () => ({ kind: 'paused' }));
    expect(paused.status).toBe(503);
    expect(paused.headers.get('retry-after')).toBe('3600');
    expect(await paused.text()).toBe('This course is paused. It will be back at this address.\n');
    const removed = await courseMarkdownResponse('algorithms', async () => ({ kind: 'removed' }));
    expect(removed.status).toBe(410);
    const moved = await courseMarkdownResponse('algorithms', async () => ({ kind: 'moved', slug: 'algo' }));
    expect(moved.status).toBe(308);
    expect(moved.headers.get('location')).toBe('/learn/courses/algo.md');
    const missing = await courseMarkdownResponse('algorithms', async () => ({ kind: 'missing' }));
    expect(missing.status).toBe(404);
    for (const res of [paused, removed, moved, missing]) {
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('asks again in a minute when the course or the list cannot be read', async () => {
    const course = await courseMarkdownResponse('algorithms', async () => {
      throw new Error('down');
    });
    const all = await coursesMarkdownResponse(async () => {
      throw new Error('down');
    });
    for (const res of [course, all]) {
      expect(res.status).toBe(503);
      expect(res.headers.get('retry-after')).toBe('60');
    }
  });

  it('serves all courses as Markdown, with the list as the canonical', async () => {
    const res = await coursesMarkdownResponse(async () => courseCards);
    expect(res.headers.get('link')).toBe('</learn/courses>; rel="canonical"');
    const text = await res.text();
    expect(text).toMatch(/^# All courses\n/);
    expect(text).not.toContain(LONG_DASH);
  });
});

describe("a course's picture and that of all courses", () => {
  const png = new Uint8Array([1, 2, 3]) as Uint8Array<ArrayBuffer>;

  it('draws a live course only under its current version, else sends there', async () => {
    const version = courseCardVersionOf(algorithmsCourse);
    const draw = vi.fn(async () => png);
    const drawn = await courseCardResponse('algorithms', `?v=${version}`, async () => live, draw);
    expect(drawn.status).toBe(200);
    expect(drawn.headers.get('content-type')).toBe('image/png');
    expect(draw).toHaveBeenCalledWith(algorithmsCourse);
    for (const search of ['', '?v=old', `?v=${version}&x=1`]) {
      const sent = await courseCardResponse('algorithms', search, async () => live, draw);
      expect(sent.status, search).toBe(308);
      expect(sent.headers.get('location')).toBe(`/learn/courses/algorithms/card.png?v=${version}`);
    }
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('follows the course’s state, and asks again when drawing fails', async () => {
    const removed = await courseCardResponse('algorithms', '', async () => ({ kind: 'removed' }));
    expect(removed.status).toBe(410);
    const moved = await courseCardResponse('algorithms', '', async () => ({ kind: 'moved', slug: 'algo' }));
    expect(moved.headers.get('location')).toBe('/learn/courses/algo/card.png');
    const version = courseCardVersionOf(algorithmsCourse);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await courseCardResponse(
      'algorithms',
      `?v=${version}`,
      async () => live,
      async () => {
        throw new Error('no font');
      },
    );
    expect(failed.status).toBe(503);
  });

  it('draws all courses under the version of their figures', async () => {
    const version = coursesCardVersionOf(courseCards);
    const draw = vi.fn(async () => png);
    expect((await coursesCardResponse(`?v=${version}`, async () => courseCards, draw)).status).toBe(200);
    const sent = await coursesCardResponse('', async () => courseCards, draw);
    expect(sent.headers.get('location')).toBe(`/learn/courses/card.png?v=${version}`);
    // One more course is a new picture.
    expect(coursesCardVersionOf(courseCards.slice(1))).not.toBe(version);
  });
});
