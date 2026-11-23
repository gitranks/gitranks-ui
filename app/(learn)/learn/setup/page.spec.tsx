import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse, loadLearnCourses, connection } = vi.hoisted(() => ({
  loadLearnCourse: vi.fn(),
  loadLearnCourses: vi.fn(),
  connection: vi.fn(async () => undefined),
}));
vi.mock('next/server', async (original) => ({ ...(await original<object>()), connection }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse, loadLearnCourses }));
vi.mock('@/components/learn/setup/setup-live', () => ({ SetupLive: () => null }));

const { default: SetupPage, metadata } = await import('./page');
const { algorithmsCourse, courseCards, goCourse } = await import('@/lib/learn/__fixtures__/course');
const { setupStartOf } = await import('@/lib/learn/setup');

const startsOf = async () => ((await SetupPage()) as ReactElement<{ starts: unknown }>).props.starts;

beforeEach(() => {
  loadLearnCourse.mockReset();
  loadLearnCourses.mockReset();
});

describe('Set up Learn’s page', () => {
  it('is the person’s own: never indexed', () => {
    expect(metadata).toEqual({ title: 'Set up Learn', robots: { index: false, follow: false } });
  });

  it('is drawn for each request, never built ahead', async () => {
    loadLearnCourses.mockResolvedValue([]);
    await startsOf();
    expect(connection).toHaveBeenCalled();
  });

  it('reads where each language starts from the cached courses, and only the courses that are live', async () => {
    loadLearnCourses.mockResolvedValue(courseCards);
    loadLearnCourse.mockImplementation(async (slug: string) =>
      slug === 'go' ? goCourse : slug === 'algorithms' ? algorithmsCourse : null,
    );
    expect(await startsOf()).toEqual({
      byLanguage: { go: setupStartOf(goCourse) },
      fallback: setupStartOf(algorithmsCourse),
    });
  });

  it('has no start when the courses cannot be read, so the save opens all courses', async () => {
    loadLearnCourses.mockRejectedValue(new Error('down'));
    expect(await startsOf()).toEqual({ byLanguage: {}, fallback: null });
    expect(loadLearnCourse).not.toHaveBeenCalled();
  });

  it('leaves out a course that cannot be read', async () => {
    loadLearnCourses.mockResolvedValue(courseCards);
    loadLearnCourse.mockRejectedValue(new Error('down'));
    expect(await startsOf()).toEqual({ byLanguage: {}, fallback: null });
  });
});
