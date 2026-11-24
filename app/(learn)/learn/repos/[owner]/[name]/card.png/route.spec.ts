import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { response, state } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  state: vi.fn(async (_route: unknown) => ({ kind: 'missing' as const })),
}));
vi.mock('@/components/learn/share/course-card-response', () => ({ courseCardResponse: response }));
vi.mock('@/lib/learn/course-share.data', () => ({ loadProjectCourseShareState: state }));

const { GET } = await import('./route');
const Org = await import('../../../../orgs/[login]/card.png/route');

beforeEach(() => {
  response.mockClear();
  state.mockClear();
});

describe("a project course's picture", () => {
  it("is the course's own, read by its project in lower case, for the query asked", async () => {
    await GET(new NextRequest('https://0.0.0.0:3000/learn/repos/Django/Django/card.png?v=abc'), {
      params: Promise.resolve({ owner: 'Django', name: 'Django' }),
    } as never);
    const [slug, search, read] = response.mock.calls[0] as [string, string, () => Promise<unknown>];
    expect([slug, search]).toEqual(['django/django', '?v=abc']);
    await read();
    expect(state).toHaveBeenCalledWith({ kind: 'repository', slug: 'django/django' });

    await Org.GET(new NextRequest('https://0.0.0.0:3000/learn/orgs/kubernetes/card.png'), {
      params: Promise.resolve({ login: 'kubernetes' }),
    } as never);
    await (response.mock.calls[1][2] as () => Promise<unknown>)();
    expect(state).toHaveBeenLastCalledWith({ kind: 'org', slug: 'kubernetes' });
  });

  it('is not found for names GitHub cannot have, asking nothing', async () => {
    const res = await Org.GET(new NextRequest('https://0.0.0.0:3000/learn/orgs/a_b/card.png'), {
      params: Promise.resolve({ login: 'a_b' }),
    } as never);
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(response).not.toHaveBeenCalled();
  });
});
