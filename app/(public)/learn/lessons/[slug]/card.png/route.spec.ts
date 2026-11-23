import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { response, state } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  state: vi.fn(async (_slug: string) => ({ kind: 'missing' as const })),
}));
vi.mock('@/components/learn/share/lesson-card-response', () => ({ lessonCardResponse: response }));
vi.mock('@/lib/learn/lesson-share.data', () => ({ loadLessonShareState: state }));

const { GET } = await import('./route');

describe("a lesson's picture", () => {
  it("is the lesson's own, for its slug and the query asked", async () => {
    await GET(new NextRequest('https://0.0.0.0:3000/learn/lessons/sets/card.png?v=abc'), {
      params: Promise.resolve({ slug: 'sets' }),
    } as never);
    const [kind, slug, search, read] = response.mock.calls[0] as [string, string, string, () => Promise<unknown>];
    expect([kind, slug, search]).toEqual(['lesson', 'sets', '?v=abc']);
    await read();
    expect(state).toHaveBeenCalledWith('sets');
  });
});
