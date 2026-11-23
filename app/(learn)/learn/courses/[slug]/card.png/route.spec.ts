import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { response, state } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  state: vi.fn(async (_slug: string) => ({ kind: 'missing' as const })),
}));
vi.mock('@/lib/learn/course-card', () => ({ courseCardResponse: response }));
vi.mock('@/lib/learn/course-share.data', () => ({ loadCourseShareState: state }));

const { GET } = await import('./route');

describe("a course's picture", () => {
  it("is the course's own, for its slug and the query asked", async () => {
    await GET(new NextRequest('https://0.0.0.0:3000/learn/courses/algorithms/card.png?v=abc'), {
      params: Promise.resolve({ slug: 'algorithms' }),
    } as never);
    const [slug, search, read] = response.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect([slug, search]).toEqual(['algorithms', '?v=abc']);
    await read();
    expect(state).toHaveBeenCalledWith('algorithms');
  });
});
