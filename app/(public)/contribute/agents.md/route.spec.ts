import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  contributeShown: vi.fn(async () => true),
  contributeOpen: vi.fn(async () => true),
  loadAgentPage: vi.fn(async () => null),
}));
vi.mock('server-only', () => ({}));
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
      new Error('[{"message":"Cannot query field \\"issueNumbers\\" on type \\"Query\\"."}]'),
    );
    const doc = await (await GET()).text();
    expect(doc).toContain('- New claims: 10 a day');
    expect(doc).not.toContain('Full issues a day');
  });

  it('lists full issues a day once the API says the rules are live', async () => {
    m.graphqlDirect.mockResolvedValue({ issueNumbers: { rulesLive: true } });
    const doc = await (await GET()).text();
    expect(doc).toContain('- Full issues a day: From your GitRanks tier, 10 to 70');
    expect(doc).not.toContain('New claims');
  });
});
