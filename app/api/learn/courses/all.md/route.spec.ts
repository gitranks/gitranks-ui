import { describe, expect, it, vi } from 'vitest';

const { loadLearnCourses } = vi.hoisted(() => ({ loadLearnCourses: vi.fn(async () => []) }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses }));

const { GET } = await import('./route');

describe('the Markdown copy of all courses', () => {
  it('is written from the cached list', async () => {
    const response = await GET();
    expect(loadLearnCourses).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('No course is open yet.');
  });
});
