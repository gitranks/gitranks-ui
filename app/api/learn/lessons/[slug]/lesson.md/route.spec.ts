import { describe, expect, it, vi } from 'vitest';

const { state } = vi.hoisted(() => ({ state: vi.fn(async (_slug: string) => ({ kind: 'removed' as const })) }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/lesson-share.data', () => ({ loadLessonShareState: state }));

const { GET } = await import('./route');

describe("a lesson's Markdown copy", () => {
  it("answers by the lesson's state, read for its own slug", async () => {
    const response = await GET(new Request('https://0.0.0.0:3000/api/learn/lessons/sets/lesson.md'), {
      params: Promise.resolve({ slug: 'sets' }),
    } as never);
    expect(state).toHaveBeenCalledWith('sets');
    expect(response.status).toBe(410);
  });
});
