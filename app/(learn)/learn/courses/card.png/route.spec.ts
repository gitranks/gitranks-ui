import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { response, loadLearnCourses } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  loadLearnCourses: vi.fn(async () => []),
}));
vi.mock('@/lib/learn/course-card', () => ({ coursesCardResponse: response }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses }));

const { GET } = await import('./route');

describe("all courses' picture", () => {
  it('is drawn from the cached list, for the query asked', async () => {
    await GET(new NextRequest('https://0.0.0.0:3000/learn/courses/card.png?v=abc'));
    expect(response).toHaveBeenCalledWith('?v=abc', loadLearnCourses);
  });
});
