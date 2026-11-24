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

/** The day's sample as the API answers it now: every row masked, the fields that name its issue null. */
const MASKED_SAMPLE_PAGE = {
  stats: { readyIssues: 2792, repos: 1291, languages: [], checkedAt: '2026-11-24T12:05:55.738Z' },
  sample: {
    day: '2026-11-24',
    items: [
      {
        repo: null,
        number: null,
        url: null,
        title: null,
        labels: null,
        language: 'ruby',
        kind: 'bug',
        size: 'S',
        why: null,
        testCommand: false,
        masked: {
          id: 'u20lc80rj5',
          title: 'A bug in a Ruby project',
          language: 'Ruby',
          size: 'S',
          kind: 'bug',
          projectTier: null,
          project: null,
          hints: [{ kind: 'AGREED', count: null }],
        },
      },
    ],
  },
};

describe('/contribute/agents.md', () => {
  it('lists full issues a day, and a shared cache may keep it once launched', async () => {
    const response = await GET();
    const doc = await response.text();
    expect(doc).toContain('- Full issues a day: From your GitRanks tier, 10 to 70');
    expect(doc).not.toContain('New claims');
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
  });

  it("answers the page with today's masked sample, and never fails on a bad one", async () => {
    m.loadAgentPage.mockResolvedValue(MASKED_SAMPLE_PAGE);
    const response = await GET();
    expect(response.status).toBe(200);
    const doc = await response.text();
    expect(doc).toContain('2,792 issues ready in 1,291 repositories');
    expect(doc).toContain('- ` A bug in a Ruby project ` (Ruby, bug, size S)');

    for (const sample of [null, { day: null, items: null }, { day: 'd', items: [{ why: 'x', masked: 3 }] }]) {
      m.loadAgentPage.mockResolvedValue({ ...MASKED_SAMPLE_PAGE, sample });
      const bad = await GET();
      expect(bad.status).toBe(200);
      expect(await bad.text()).toContain('## The one human step');
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
