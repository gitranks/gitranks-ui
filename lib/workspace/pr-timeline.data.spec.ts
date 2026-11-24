import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ graphqlDirect: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock('next/cache', () => ({ cacheTag: m.cacheTag, cacheLife: m.cacheLife }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: m.graphqlDirect }));

const { publicPrTimelineHelped } = await import('./pr-timeline.data');

const pr = { nameWithOwner: 'driftwood-js/driftwood', number: 1419 };
const answer = (timeline: unknown) => ({ contributePrTimeline: { timeline } });

beforeEach(() => {
  for (const mock of Object.values(m)) mock.mockReset();
});

describe('publicPrTimelineHelped', () => {
  it("reads who said it helped in its own operation, beside the page's, under the page's tag", async () => {
    m.graphqlDirect.mockResolvedValue(answer({ helpedBy: ['mara-k', 'lindqvist'], helpedNamed: 4 }));
    expect(await publicPrTimelineHelped(pr)).toEqual({ helpedBy: ['mara-k', 'lindqvist'], helpedNamed: 4 });
    const sent = print(m.graphqlDirect.mock.calls[0][0]);
    expect(sent).toContain('query PrTimelineHelped');
    expect(sent).not.toContain('milestones');
    expect(m.graphqlDirect.mock.calls[0].slice(1)).toEqual([
      { owner: 'driftwood-js', repo: 'driftwood', number: 1419 },
      { source: 'ssr' },
    ]);
    expect(m.cacheTag).toHaveBeenCalled();
  });

  it('keeps only logins, five at most, and never counts fewer named than it shows', async () => {
    m.graphqlDirect.mockResolvedValue(answer({ helpedBy: ['a', '-bad-', 'b', 'c', 'd', 'e', 'f'], helpedNamed: 1 }));
    expect(await publicPrTimelineHelped(pr)).toEqual({ helpedBy: ['a', 'b', 'c', 'd', 'e'], helpedNamed: 5 });
  });

  it('answers null for nobody named, an API that does not know the fields, and any failure', async () => {
    m.graphqlDirect.mockResolvedValueOnce(answer({ helpedBy: [], helpedNamed: 0 }));
    expect(await publicPrTimelineHelped(pr)).toBeNull();
    m.graphqlDirect.mockResolvedValueOnce(answer(null));
    expect(await publicPrTimelineHelped(pr)).toBeNull();
    m.graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "helpedBy"'));
    expect(await publicPrTimelineHelped(pr)).toBeNull();
    expect(await publicPrTimelineHelped({ nameWithOwner: '_/_', number: 1 })).toBeNull();
  });
});
