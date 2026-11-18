import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  sessionTokenOf: vi.fn(async (_req: unknown): Promise<unknown> => null),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));

const { prTimelineGateOf, prTimelineShortTargetOf, resetPrTimelineOpen } = await import('./pr-timeline-gate');

const PR = { nameWithOwner: 'acme/widgets', number: 42 };
const ID = '6728f0c2a1b2c3d4e5f60718';
const request = { headers: new Headers() };
type Doc = { definitions: { name?: { value: string } }[] };
const nameOf = (doc: Doc) => doc.definitions[0]?.name?.value;

/** The API: open or not, and what the reads answer. */
function api(open: boolean, page: unknown, byAttempt: unknown = null) {
  graphqlDirect.mockImplementation(async (doc: Doc) => {
    const name = nameOf(doc);
    if (name === 'PrTimelineOpen') return { contributePrTimelineOpen: open };
    if (name === 'PrTimeline') return { contributePrTimeline: page };
    if (name === 'PrTimelineByAttempt') return { contributePrTimelineByAttempt: byAttempt };
    throw new Error(`unexpected ${name}`);
  });
}

describe('the PR timeline gate', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    sessionTokenOf.mockReset();
    sessionTokenOf.mockResolvedValue(null);
    resetPrTimelineOpen();
  });

  it('a page: shown, moved or missing; a failure leaves it to the page', async () => {
    api(true, { timeline: { partial: true }, movedTo: null, movedNumber: null });
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'page', partial: true, confirmed: true });
    api(true, { timeline: null, movedTo: 'acme/gadgets', movedNumber: 42 });
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'redirect', path: '/contribute/pr/acme/gadgets/42' });
    api(true, null);
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'missing' });
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await prTimelineGateOf(PR)).toEqual({ kind: 'page', partial: false, confirmed: false });
  });

  it('the short address, public: the page when shown, else the maintainers page, asked signed out', async () => {
    api(true, null, { timeline: { nameWithOwner: 'acme/widgets', number: 42 } });
    expect(await prTimelineShortTargetOf(ID, request)).toBe('/contribute/pr/acme/widgets/42');
    expect(sessionTokenOf).not.toHaveBeenCalled();
    api(true, null, null);
    expect(await prTimelineShortTargetOf(ID, request)).toBe(`/contribute/maintainers?from=${ID}`);
  });

  it('the short address before public: signed out goes to the maintainers page without a question about them', async () => {
    api(false, null, { timeline: { nameWithOwner: 'acme/widgets', number: 42 } });
    expect(await prTimelineShortTargetOf(ID, request)).toBe(`/contribute/maintainers?from=${ID}`);
    expect(graphqlDirect.mock.calls.map(([doc]) => nameOf(doc))).toEqual(['PrTimelineOpen']);
  });

  it('the short address before public: a listed person is asked about by login and email', async () => {
    api(false, null, { timeline: { nameWithOwner: 'acme/widgets', number: 42 } });
    sessionTokenOf.mockResolvedValue({ githubLogin: 'maslianok', email: 'owner@example.com' });
    expect(await prTimelineShortTargetOf(ID, request)).toBe('/contribute/pr/acme/widgets/42');
    const [, , options] = graphqlDirect.mock.calls.find(([doc]) => nameOf(doc) === 'PrTimelineByAttempt') ?? [];
    expect(options).toMatchObject({ githubLogin: 'maslianok', accountEmail: 'owner@example.com' });
  });

  it('a slow answer goes to the maintainers page', async () => {
    api(true, null);
    graphqlDirect.mockImplementation(async (doc: Doc) =>
      nameOf(doc) === 'PrTimelineOpen' ? { contributePrTimelineOpen: true } : new Promise(() => undefined),
    );
    expect(await prTimelineShortTargetOf(ID, request, 10)).toBe(`/contribute/maintainers?from=${ID}`);
  });
});
