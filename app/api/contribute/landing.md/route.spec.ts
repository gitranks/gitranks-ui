import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  contributeShown: vi.fn(async () => true),
  contributeOpen: vi.fn(async () => true),
  loadAgentPage: vi.fn(async (): Promise<unknown> => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('@/lib/workspace/preview-gate', () => ({
  contributeShown: m.contributeShown,
  contributeOpen: m.contributeOpen,
}));
vi.mock('@/lib/contribute/agent-page', () => ({ loadAgentPage: m.loadAgentPage }));

const { GET } = await import('./route');

beforeEach(() => {
  m.contributeShown.mockResolvedValue(true);
  m.contributeOpen.mockResolvedValue(true);
  m.loadAgentPage.mockResolvedValue(null);
});

describe('/contribute.md (answered here)', () => {
  it("answers the landing in Markdown with the day's numbers, and a shared cache may keep it once launched", async () => {
    m.loadAgentPage.mockResolvedValue({
      stats: { readyIssues: 2792, repos: 1291, languages: [], checkedAt: null },
      sample: { day: null, items: [] },
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
    const doc = await response.text();
    expect(doc).toContain('# GitRanks Contribute');
    expect(doc).toContain('2,792 issues ready in 1,291 repositories.');
  });

  it('answers without the numbers when they are not there or broken', async () => {
    for (const page of [null, { stats: { readyIssues: null }, sample: null }]) {
      m.loadAgentPage.mockResolvedValue(page);
      const response = await GET();
      expect(response.status).toBe(200);
      expect(await response.text()).not.toContain('issues ready in');
    }
  });

  it('is kept by no cache before the launch, and not found for whoever may not see Contribute', async () => {
    m.contributeOpen.mockResolvedValue(false);
    expect((await GET()).headers.get('Cache-Control')).toBe('private, no-store');
    m.contributeShown.mockResolvedValue(false);
    const hidden = await GET();
    expect(hidden.status).toBe(404);
    expect(hidden.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
