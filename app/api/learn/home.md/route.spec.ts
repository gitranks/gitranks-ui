import { describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
  loadLearnCourses: vi.fn(async () => []),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: m.connection }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses: m.loadLearnCourses }));

const { GET } = await import('./route');

describe('/learn.md, answered here', () => {
  it("is the landing's copy, read per request", async () => {
    const response = await GET();
    expect(m.connection).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('# GitRanks Learn');
    expect(m.loadLearnCourses).toHaveBeenCalledTimes(1);
  });
});
