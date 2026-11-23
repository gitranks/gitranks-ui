import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { learnAddressGateFrom, learnAddressGateOf } = await import('./address-gate');
const { LearnAddressDocument } = await import('./lesson-page.documents');

const answer = (state: string, movedTo: string | null = null) => ({
  learnAddress: { state, movedTo, title: 'Sets', course: { slug: 'algorithms', title: 'Algorithms' } },
});

describe('learnAddressGateFrom', () => {
  it('lets a live address through, and names a paused and a removed one', () => {
    expect(learnAddressGateFrom('lesson', { state: 'LIVE', movedTo: null })).toEqual({ kind: 'page' });
    expect(learnAddressGateFrom('lesson', { state: 'PAUSED', movedTo: null })).toEqual({ kind: 'paused' });
    expect(learnAddressGateFrom('course', { state: 'REMOVED', movedTo: null })).toEqual({ kind: 'removed' });
  });

  it('sends a moved address to the new one of its own kind, and treats a move to nowhere as missing', () => {
    expect(learnAddressGateFrom('lesson', { state: 'MOVED', movedTo: 'sets-2' })).toEqual({
      kind: 'moved',
      path: '/learn/lessons/sets-2',
      slug: 'sets-2',
    });
    expect(learnAddressGateFrom('course', { state: 'MOVED', movedTo: 'algos' })).toEqual({
      kind: 'moved',
      path: '/learn/courses/algos',
      slug: 'algos',
    });
    for (const movedTo of [null, '', '../x', 'Sets', 'https://example.com']) {
      expect(learnAddressGateFrom('lesson', { state: 'MOVED', movedTo }), String(movedTo)).toEqual({ kind: 'missing' });
    }
  });

  it('treats a missing address, and any state it does not know, as missing', () => {
    expect(learnAddressGateFrom('lesson', { state: 'MISSING', movedTo: null })).toEqual({ kind: 'missing' });
    expect(learnAddressGateFrom('lesson', { state: 'DRAFT' as never, movedTo: null })).toEqual({ kind: 'missing' });
  });
});

describe('learnAddressGateOf', () => {
  beforeEach(() => graphqlDirect.mockReset());

  it('asks the address, with no session', async () => {
    graphqlDirect.mockResolvedValueOnce(answer('PAUSED'));
    expect(await learnAddressGateOf('lesson', 'sets')).toEqual({ kind: 'paused' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnAddressDocument,
      { kind: 'lesson', slug: 'sets' },
      { source: 'ssr' },
    );
  });

  it("answers a slug that is not a slug's shape as missing, without asking", async () => {
    for (const slug of ['_gone', 'Sets', 'a b']) {
      expect(await learnAddressGateOf('course', slug), slug).toEqual({ kind: 'missing' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('says it does not know on a failed or an empty answer', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await learnAddressGateOf('lesson', 'sets')).toEqual({ kind: 'unknown' });
    graphqlDirect.mockResolvedValueOnce({ learnAddress: null });
    expect(await learnAddressGateOf('lesson', 'sets')).toEqual({ kind: 'unknown' });
  });

  it('waits no longer than the limit', async () => {
    vi.useFakeTimers();
    try {
      graphqlDirect.mockReturnValueOnce(new Promise(() => {}));
      let settled = false;
      const gate = learnAddressGateOf('lesson', 'sets', 2000).finally(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(1999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await gate).toEqual({ kind: 'unknown' });
    } finally {
      vi.useRealTimers();
    }
  });
});
