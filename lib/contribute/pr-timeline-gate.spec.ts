import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { prTimelineGateOf, prTimelineShortTargetOf } = await import('./pr-timeline-gate');

const PR = { nameWithOwner: 'acme/widgets', number: 42 };
const ID = '6728f0c2a1b2c3d4e5f60718';
type Doc = { definitions: { name?: { value: string } }[] };
const nameOf = (doc: Doc) => doc.definitions[0]?.name?.value;

/** The API: what the reads answer. */
function api(page: unknown, byAttempt: unknown = null) {
  graphqlDirect.mockImplementation(async (doc: Doc) => {
    const name = nameOf(doc);
    if (name === 'PrTimeline') return { contributePrTimeline: page };
    if (name === 'PrTimelineByAttempt') return { contributePrTimelineByAttempt: byAttempt };
    throw new Error(`unexpected ${name}`);
  });
}

describe('the PR timeline gate', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
  });

  it('a page: shown, moved or missing; a failure leaves it to the page', async () => {
    api({ timeline: { partial: true }, movedTo: null, movedNumber: null });
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'page', partial: true, confirmed: true });
    api({ timeline: null, movedTo: 'acme/gadgets', movedNumber: 42 });
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'redirect', path: '/contribute/pr/acme/gadgets/42' });
    api(null);
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'missing' });
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'page', partial: false, confirmed: false });
  });

  it('the short address: the page when shown, else the maintainers page', async () => {
    api(null, { timeline: { nameWithOwner: 'acme/widgets', number: 42 } });
    expect(await prTimelineShortTargetOf(ID)).toBe('/contribute/pr/acme/widgets/42');
    api(null, null);
    expect(await prTimelineShortTargetOf(ID)).toBe(`/contribute/maintainers?from=${ID}`);
  });

  it('a slow answer goes to the maintainers page', async () => {
    graphqlDirect.mockImplementation(() => new Promise(() => undefined));
    expect(await prTimelineShortTargetOf(ID, 10)).toBe(`/contribute/maintainers?from=${ID}`);
  });
});
