import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  contributeShown: vi.fn(async () => true),
  contributeOpen: vi.fn(async () => true),
  loadAgentPage: vi.fn(async () => null),
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
});

describe('/contribute/agents.md', () => {
  it('lists full issues a day, and a shared cache may keep it once launched', async () => {
    const response = await GET();
    const doc = await response.text();
    expect(doc).toContain('- Full issues a day: From your GitRanks tier, 10 to 70');
    expect(doc).not.toContain('New claims');
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
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
