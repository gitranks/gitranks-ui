import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, openIssues } = vi.hoisted(() => ({
  state: vi.fn(async (_route: unknown) => ({ kind: 'removed' as const })),
  openIssues: vi.fn(async (_project: unknown) => 3),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/course-share.data', () => ({ loadProjectCourseShareState: state }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnProjectOpenIssues: openIssues }));

const { GET } = await import('./route');
const Org = await import('../../../../orgs/[login]/course.md/route');
const { djangoCourse } = await import('@/lib/learn/__fixtures__/course');

beforeEach(() => {
  state.mockClear();
  openIssues.mockClear();
});

describe("a project course's Markdown copy", () => {
  it("answers by the course's state, read by its project in lower case", async () => {
    const removed = await GET(new Request('https://0.0.0.0:3000/api/learn/projects/repos/Django/Django/course.md'), {
      params: Promise.resolve({ owner: 'Django', name: 'Django' }),
    } as never);
    expect(state).toHaveBeenCalledWith({ kind: 'repository', slug: 'django/django' });
    expect(removed.status).toBe(410);
    expect(openIssues).not.toHaveBeenCalled();
  });

  it('writes a live course with its open issues, read for its project', async () => {
    state.mockResolvedValueOnce({ kind: 'live', course: djangoCourse } as never);
    const live = await GET(new Request('https://0.0.0.0:3000/api/learn/projects/repos/django/django/course.md'), {
      params: Promise.resolve({ owner: 'django', name: 'django' }),
    } as never);
    expect(live.status).toBe(200);
    expect(await live.text()).toContain('3 open issues to fix');
    expect(openIssues).toHaveBeenCalledWith({ repo: 'django/django' });
  });

  it("is an organisation's too, and not found for names GitHub cannot have", async () => {
    await Org.GET(new Request('https://0.0.0.0:3000/api/learn/projects/orgs/kubernetes/course.md'), {
      params: Promise.resolve({ login: 'kubernetes' }),
    } as never);
    expect(state).toHaveBeenCalledWith({ kind: 'org', slug: 'kubernetes' });
    state.mockClear();
    const odd = await Org.GET(new Request('https://0.0.0.0:3000/api/learn/projects/orgs/a_b/course.md'), {
      params: Promise.resolve({ login: 'a_b' }),
    } as never);
    expect(odd.status).toBe(404);
    expect(state).not.toHaveBeenCalled();
  });
});
