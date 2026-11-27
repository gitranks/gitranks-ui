import { describe, expect, it, vi } from 'vitest';

const { loadInterviewsHome } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
  return { loadInterviewsHome: vi.fn() };
});
vi.mock('server-only', () => ({}));
vi.mock('next/server', async (actual) => ({ ...(await actual<object>()), connection: vi.fn(async () => {}) }));
vi.mock('@/lib/interviews/home.data', () => ({ loadInterviewsHome }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses: vi.fn(async () => []) }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeOpen: vi.fn(async () => false) }));

const { GET } = await import('./route');

describe('/llms.txt', () => {
  it('reads and writes nothing of Interviews while it is not open to everyone', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toMatch(/^# GitRanks\n/);
    expect(text).not.toContain('## Interviews');
    expect(text).not.toContain('/interviews');
    expect(loadInterviewsHome).not.toHaveBeenCalled();
  });
});
