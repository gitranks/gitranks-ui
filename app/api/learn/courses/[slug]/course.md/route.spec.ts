import { describe, expect, it, vi } from 'vitest';

const { state } = vi.hoisted(() => ({ state: vi.fn(async (_slug: string) => ({ kind: 'removed' as const })) }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/course-share.data', () => ({ loadCourseShareState: state }));

const { GET } = await import('./route');

describe("a course's Markdown copy", () => {
  it("answers by the course's state, read for its own slug", async () => {
    const response = await GET(new Request('https://0.0.0.0:3000/api/learn/courses/algorithms/course.md'), {
      params: Promise.resolve({ slug: 'algorithms' }),
    } as never);
    expect(state).toHaveBeenCalledWith('algorithms');
    expect(response.status).toBe(410);
  });
});
