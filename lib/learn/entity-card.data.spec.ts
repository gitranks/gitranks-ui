import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { LEARN_ENTITY_CARD_TIMEOUT_MS, loadLearnEntityCard } = await import('./entity-card.data');
const { LearnEntityCardDocument } = await import('./entity-card.documents');
const { entityCards } = await import('./__fixtures__/entity-card');

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
});

describe('loadLearnEntityCard', () => {
  it("reads a repository's card in lower case, under its own tag, kept for hours, with a time limit", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnEntityCard: entityCards.repoEverything });
    expect(await loadLearnEntityCard({ repo: 'Nebula/UI' })).toEqual({ card: entityCards.repoEverything, ok: true });
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnEntityCardDocument,
      { repo: 'nebula/ui' },
      { source: 'ssr', signal: expect.any(AbortSignal) },
    );
    expect(cacheTag.mock.calls.flat()).toEqual(['learn:entity:repo:nebula/ui']);
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    expect(LEARN_ENTITY_CARD_TIMEOUT_MS).toBeLessThanOrEqual(3_000);
  });

  it("reads an org's card by its login in lower case", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnEntityCard: entityCards.orgEverything });
    expect(await loadLearnEntityCard({ org: 'Nebula' })).toEqual({ card: entityCards.orgEverything, ok: true });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ org: 'nebula' });
    expect(cacheTag.mock.calls.flat()).toEqual(['learn:entity:org:nebula']);
  });

  it('answers no card, for hours, when the API has none (nothing shown, kept out, or taken down)', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnEntityCard: null });
    expect(await loadLearnEntityCard({ repo: 'octo/kept-out' })).toEqual({ card: null, ok: true });
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('answers no card on a failed or slow read, kept for minutes and never thrown', async () => {
    for (const failure of [new Error('down'), Object.assign(new Error('slow'), { name: 'TimeoutError' })]) {
      graphqlDirect.mockRejectedValueOnce(failure);
      expect(await loadLearnEntityCard({ org: 'nebula' })).toEqual({ card: null, ok: false });
      expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    }
  });

  it('asks nothing for a project no tag can name', async () => {
    for (const project of [{ repo: 'no-slash' }, { repo: 'a/b/c' }, { org: '' }]) {
      expect(await loadLearnEntityCard(project), JSON.stringify(project)).toEqual({ card: null, ok: true });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(cacheTag).not.toHaveBeenCalled();
  });
});
