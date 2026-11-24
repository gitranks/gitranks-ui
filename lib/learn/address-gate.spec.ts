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

describe("a project course's address", () => {
  beforeEach(() => graphqlDirect.mockReset());

  it("sends a live project course asked for by its slug to its project's address, and nothing else", () => {
    expect(
      learnAddressGateFrom('course', { state: 'LIVE', movedTo: null, path: '/learn/repos/django/django' }),
    ).toEqual({ kind: 'elsewhere', path: '/learn/repos/django/django' });
    expect(learnAddressGateFrom('course', { state: 'LIVE', movedTo: null, path: '/learn/orgs/kubernetes' })).toEqual({
      kind: 'elsewhere',
      path: '/learn/orgs/kubernetes',
    });
    // Its own address, a lesson's, and a path no project course has: the page asked for.
    expect(learnAddressGateFrom('repository', { state: 'LIVE', movedTo: null, path: '/learn/repos/a/b' })).toEqual({
      kind: 'page',
    });
    expect(learnAddressGateFrom('lesson', { state: 'LIVE', movedTo: null, path: '/learn/repos/a/b' })).toEqual({
      kind: 'page',
    });
    for (const path of [
      null,
      undefined,
      '',
      '/learn/courses/django',
      'https://example.com/learn/orgs/x',
      '/learn/orgs/a_b',
    ]) {
      expect(learnAddressGateFrom('course', { state: 'LIVE', movedTo: null, path }), String(path)).toEqual({
        kind: 'page',
      });
    }
  });

  it('asks a repository by `owner/name` and an organisation by its login, and nothing of another shape', async () => {
    const { isAddressSlug } = await import('./address-gate');
    expect(isAddressSlug('repository', 'django/django')).toBe(true);
    expect(isAddressSlug('org', 'kubernetes')).toBe(true);
    for (const slug of ['django', 'a/b/c', '_gone/x', 'a/..'])
      expect(isAddressSlug('repository', slug), slug).toBe(false);
    for (const slug of ['a/b', '_gone', '-x']) expect(isAddressSlug('org', slug), slug).toBe(false);
    expect(isAddressSlug('course', 'django/django')).toBe(false);

    graphqlDirect.mockResolvedValueOnce(answer('REMOVED'));
    expect(await learnAddressGateOf('repository', 'django/django')).toEqual({ kind: 'removed' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnAddressDocument,
      { kind: 'repository', slug: 'django/django' },
      { source: 'ssr' },
    );
    expect(await learnAddressGateOf('org', '_gone')).toEqual({ kind: 'missing' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });
});
