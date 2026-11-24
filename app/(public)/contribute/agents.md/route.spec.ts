import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  contributeShown: vi.fn(async () => true),
  contributeOpen: vi.fn(async () => true),
  loadAgentPage: vi.fn(async () => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: () => {} }));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: m.graphqlDirect }));
vi.mock('@/lib/workspace/preview-gate', () => ({
  contributeShown: m.contributeShown,
  contributeOpen: m.contributeOpen,
}));
vi.mock('@/lib/contribute/agent-page', () => ({ loadAgentPage: m.loadAgentPage }));

const { GET } = await import('./route');
const { resetIssueRulesLive } = await import('@/lib/workspace/rules-live');

beforeEach(() => {
  m.graphqlDirect.mockReset();
  resetIssueRulesLive();
});

describe('/contribute/agents.md', () => {
  it('lists today’s limits while the API does not know whether the rules are live', async () => {
    m.graphqlDirect.mockRejectedValue(
      new Error('[{"message":"Cannot query field \\"termsDate\\" on type \\"IssueNumbers\\"."}]'),
    );
    const response = await GET();
    const doc = await response.text();
    expect(doc).toContain('- New claims: 10 a day');
    expect(doc).not.toContain('Full issues a day');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
  });

  it('lists full issues a day once the API says the rules are live', async () => {
    m.graphqlDirect.mockResolvedValue({ issueNumbers: { rulesLive: true, termsDate: '2026-11-26T00:00:00.000Z' } });
    const doc = await (await GET()).text();
    expect(doc).toContain('- Full issues a day: From your GitRanks tier, 10 to 70');
    expect(doc).not.toContain('New claims');
  });

  it('lists the shared limits, says the rest could not be loaded and is kept by no cache while the API does not answer', async () => {
    m.graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));
    const response = await GET();
    const doc = await response.text();
    expect(doc).toContain('- Requests: 300 a minute');
    expect(doc).toContain('The limits on issues could not be loaded just now.');
    expect(doc).not.toMatch(/New claims|Full issues a day/);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
