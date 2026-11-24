import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { response, state } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  state: vi.fn(async (_route: unknown) => ({ kind: 'missing' as const })),
}));
vi.mock('@/components/learn/share/course-card-response', () => ({ courseCardResponse: response }));
vi.mock('@/lib/learn/course-share.data', () => ({ loadProjectCourseShareState: state }));

const { GET } = await import('./route');

beforeEach(() => {
  response.mockClear();
  state.mockClear();
});

describe("an organisation's course picture", () => {
  it("is the course's own, read by its login in lower case, for the query asked", async () => {
    await GET(new NextRequest('https://0.0.0.0:3000/learn/orgs/Kubernetes/card.png?v=abc'), {
      params: Promise.resolve({ login: 'Kubernetes' }),
    } as never);
    const [slug, search, read] = response.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect([slug, search]).toEqual(['kubernetes', '?v=abc']);
    await read();
    expect(state).toHaveBeenCalledWith({ kind: 'org', slug: 'kubernetes' });
  });

  it('is not found for a login GitHub cannot have, asking nothing', async () => {
    const res = await GET(new NextRequest('https://0.0.0.0:3000/learn/orgs/a_b/card.png'), {
      params: Promise.resolve({ login: 'a_b' }),
    } as never);
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(response).not.toHaveBeenCalled();
  });
});
