import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/social-card/social-card', () => ({ drawSocialCard: vi.fn() }));

import { djangoCourse, goCourse, kubernetesCourse } from './__fixtures__/course';
import { learnCourseMarkdownOf, learnCoursesMarkdownOf } from './course-markdown';
import { courseMarkdownResponse } from './course-markdown-response';
import { type CourseShareState, projectCourseShareStateOf } from './course-share';
import { courseCardVersionOf } from './course-share-card';
import { courseCardResponse } from '@/components/learn/share/course-card-response';
import { absoluteUrl } from '@/lib/seo/site';

const LONG_DASH = String.fromCodePoint(0x2014);
const live: CourseShareState = { kind: 'live', course: djangoCourse };
const repo = { kind: 'repository', slug: 'django/django' } as const;

describe("a project course's state for its copy and its picture", () => {
  it('reads the course by its project first, and its address only when it is not live', async () => {
    const course = vi.fn(async () => djangoCourse);
    const address = vi.fn(async () => null);
    expect(await projectCourseShareStateOf(repo, { course, address })).toEqual(live);
    expect(course).toHaveBeenCalledWith(repo);
    expect(address).not.toHaveBeenCalled();
    const cases: [{ state: string; movedTo: string | null } | null, CourseShareState][] = [
      [{ state: 'PAUSED', movedTo: null }, { kind: 'paused' }],
      [{ state: 'REMOVED', movedTo: null }, { kind: 'removed' }],
      // A project course keeps its project's address: a move is nothing there.
      [{ state: 'MOVED', movedTo: 'django-2' }, { kind: 'missing' }],
      [{ state: 'MISSING', movedTo: null }, { kind: 'missing' }],
      [null, { kind: 'missing' }],
    ];
    for (const [answer, state] of cases) {
      const read = { course: vi.fn(async () => null), address: vi.fn(async () => answer as never) };
      expect(await projectCourseShareStateOf(repo, read), JSON.stringify(answer)).toEqual(state);
    }
  });
});

describe("a project course's Markdown copy", () => {
  it("writes its project's lines, each group's repository, and who wrote it", () => {
    const text = learnCourseMarkdownOf(djangoCourse, { openIssues: 9 });
    expect(text).toMatch(/^# Django, from the inside\n/);
    expect(text).toContain('A repository course, in Python.');
    expect(text).toContain(`The page: ${absoluteUrl('/learn/repos/django/django')}`);
    expect(text).toContain('django/django on GitHub: https://github.com/django/django');
    expect(text).toContain(`Django on GitRanks: ${absoluteUrl('/repo/django/django')}`);
    expect(text).toContain(`9 open issues to fix: ${absoluteUrl('/learn/issues?repo=django/django')}`);
    expect(text).toContain(
      'Written by GitRanks from the project’s docs and code. Not an official Django course. Last checked against the code on 12 Nov 2026.',
    );
    expect(text).toContain('## Requests (django/django)');
    expect(text).toContain('## Contributing\n');
    expect(text.trimEnd()).toMatch(/Written by GitRanks, not by the project\.$/);
    expect(text).not.toContain(LONG_DASH);
  });

  it('leaves out what an organisation’s course has not: a page on GitRanks, open issues, a day', () => {
    const text = learnCourseMarkdownOf(kubernetesCourse);
    expect(text).toContain('An org course, in Go.');
    expect(text).toContain(`The page: ${absoluteUrl('/learn/orgs/kubernetes')}`);
    expect(text).toContain('kubernetes on GitHub: https://github.com/kubernetes');
    expect(text).toContain('It covers 3 repositories: kubernetes, kubectl and website.');
    expect(text).not.toContain('on GitRanks:');
    expect(text).not.toContain('open issue');
    expect(text).toContain('## The scheduler (kubernetes/kubernetes)');
  });

  it('lists a project course at its project’s copy, with its language', () => {
    const text = learnCoursesMarkdownOf([goCourse, djangoCourse]);
    expect(text).toContain(
      `[Django, from the inside](${absoluteUrl('/learn/repos/django/django.md')}): In Python. How a request goes through Django.`,
    );
    expect(text).toContain(`[Go](${absoluteUrl('/learn/courses/go.md')})`);
    expect(text).toContain('## Projects, from the inside\n\nFor people who want to contribute to them.');
  });

  it("serves the copy at its project's address with its open issues, and sends its slug's address there", async () => {
    const openIssues = vi.fn(async () => 3);
    const res = await courseMarkdownResponse('django/django', async () => live, { asked: 'project', openIssues });
    expect(res.status).toBe(200);
    expect(res.headers.get('link')).toBe('</learn/repos/django/django>; rel="canonical"');
    expect(await res.text()).toContain('3 open issues to fix');

    const bySlug = await courseMarkdownResponse('django', async () => live, { openIssues });
    expect(bySlug.status).toBe(308);
    expect(bySlug.headers.get('location')).toBe('/learn/repos/django/django.md');
    expect(openIssues).toHaveBeenCalledTimes(1);
  });

  it('writes the copy without the count when it cannot be read', async () => {
    const res = await courseMarkdownResponse('kubernetes', async () => ({ kind: 'live', course: kubernetesCourse }), {
      asked: 'project',
      openIssues: async () => {
        throw new Error('down');
      },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('open issue');
  });
});

describe("a project course's picture", () => {
  it("is drawn at its project's address", async () => {
    const version = courseCardVersionOf(djangoCourse);
    const draw = vi.fn(async () => new Uint8Array(1));
    const sent = await courseCardResponse('django', '', async () => live, draw);
    expect(sent.status).toBe(308);
    expect(sent.headers.get('location')).toBe(`/learn/repos/django/django/card.png?v=${version}`);
    const drawn = await courseCardResponse('django/django', `?v=${version}`, async () => live, draw);
    expect(drawn.status).toBe(200);
    expect(draw).toHaveBeenCalledWith(djangoCourse);
  });
});
