import { describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
  learnOpenToEveryone: vi.fn(async () => false),
  loadLearnCourses: vi.fn(async () => []),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: m.connection }));
vi.mock('@/lib/learn/learn-everyone', () => ({ learnOpenToEveryone: m.learnOpenToEveryone }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses: m.loadLearnCourses }));

const { GET } = await import('./route');

describe('/learn.md, answered here', () => {
  it('asks the switch per request, and is not found while Learn is closed', async () => {
    const response = await GET();
    expect(m.connection).toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(m.loadLearnCourses).not.toHaveBeenCalled();
  });

  it("is the landing's copy once Learn is open to everyone", async () => {
    m.learnOpenToEveryone.mockResolvedValueOnce(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('# GitRanks Learn');
    expect(m.loadLearnCourses).toHaveBeenCalledTimes(1);
  });
});
