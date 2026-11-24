import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  fixesCached: vi.fn(),
  loadMaskedListReads: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock('next/cache', () => ({ cacheTag: m.cacheTag, cacheLife: m.cacheLife }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: m.graphqlDirect }));
vi.mock('./issues.data', () => ({ fixesCached: m.fixesCached }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadMaskedListReads: m.loadMaskedListReads }));

const { FIX_SITEMAP_PAGES, loadFixMarks, loadFixPage, loadMergedFixKeys, NO_FIX_MARKS } = await import(
  './fix-page.data'
);
const { FIX_PR, learnFix, marksHalfWay } = await import('./__fixtures__/fix-page');
const { issueRows, learnFixes } = await import('./__fixtures__/issues');

/** The API's answer to a field it does not know yet, as it throws it. */
const unknownField = new Error(
  JSON.stringify([
    {
      message: 'Cannot query field "learnFix" on type "Query".',
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    },
  ]),
);
const operationOf = (call: unknown[]) => print(call[0] as Parameters<typeof print>[0]).match(/query (\w+)/)?.[1];

beforeEach(() => {
  for (const mock of Object.values(m)) mock.mockReset();
});

describe('loadFixPage', () => {
  it("reads the fix signed out, under the fix's, the fixes' and its timeline's tags", async () => {
    m.graphqlDirect.mockResolvedValue({ learnFix });
    expect(await loadFixPage(FIX_PR)).toEqual(learnFix);
    expect(operationOf(m.graphqlDirect.mock.calls[0])).toBe('LearnFixPage');
    expect(m.graphqlDirect.mock.calls[0].slice(1)).toEqual([
      { ref: { owner: 'driftwood-js', repo: 'driftwood', number: 1419 } },
      { source: 'ssr' },
    ]);
    expect(m.cacheTag).toHaveBeenCalledWith(
      'learn:fix:driftwood-js/driftwood#1419',
      'learn:fixes',
      expect.stringContaining('driftwood-js/driftwood'),
    );
  });

  it('answers null for none, no such fix, and an API that does not know the read yet', async () => {
    m.graphqlDirect.mockResolvedValueOnce({ learnFix: null });
    expect(await loadFixPage(FIX_PR)).toBeNull();
    m.graphqlDirect.mockRejectedValueOnce(unknownField);
    expect(await loadFixPage(FIX_PR)).toBeNull();
    m.graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }])),
    );
    expect(await loadFixPage(FIX_PR)).toBeNull();
  });

  it('throws a failed read, so no page keeps a passing outage as a 404 or a redirect', async () => {
    m.graphqlDirect.mockRejectedValueOnce(new Error('socket hang up'));
    await expect(loadFixPage(FIX_PR)).rejects.toThrow('socket hang up');
    m.graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message: 'Internal error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }])),
    );
    await expect(loadFixPage(FIX_PR)).rejects.toThrow('Internal error');
  });

  it('asks nothing for the build-time page no repository has', async () => {
    expect(await loadFixPage({ nameWithOwner: '_/_', number: 1 })).toBeNull();
    expect(m.graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('loadFixMarks', () => {
  it("reads the person's marks as them, and what their similar issues' rows need", async () => {
    const reads = { looks: null, numbers: null };
    m.loadMaskedListReads.mockResolvedValue(reads);
    m.graphqlDirect.mockResolvedValue({
      learnFixMine: {
        fixer: false,
        walkthroughHeld: false,
        answered: 2,
        passedAt: null,
        lesson: null,
        lessonAt: null,
        similar: [
          { issue: issueRows[0], because: 'SAME_LESSON' },
          { issue: issueRows[1], because: 'SAME_LANGUAGE' },
        ],
      },
    });
    expect(await loadFixMarks(FIX_PR, 'octocat')).toEqual({ marks: marksHalfWay, reads });
    expect(operationOf(m.graphqlDirect.mock.calls[0])).toBe('LearnFixMarks');
    expect(m.graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
  });

  it('asks nothing more without similar issues, and answers none on a failure', async () => {
    m.graphqlDirect.mockResolvedValueOnce({ learnFixMine: { ...marksHalfWay, walkthroughHeld: false, similar: [] } });
    expect((await loadFixMarks(FIX_PR, 'octocat')).reads).toBeNull();
    expect(m.loadMaskedListReads).not.toHaveBeenCalled();
    m.graphqlDirect.mockRejectedValueOnce(unknownField);
    expect(await loadFixMarks(FIX_PR, 'octocat')).toEqual(NO_FIX_MARKS);
  });
});

describe('loadMergedFixKeys', () => {
  it('walks the merged fixes a page at a time, keyed in lower case', async () => {
    m.fixesCached.mockResolvedValueOnce({ ...learnFixes, next: 'c1' }).mockResolvedValueOnce({
      ...learnFixes,
      rows: [{ ...learnFixes.rows[0], repo: 'Acme/Widgets', number: 7 }],
      next: null,
    });
    const keys = await loadMergedFixKeys();
    expect(m.fixesCached.mock.calls).toEqual([
      [null, null, null, null],
      [null, null, null, 'c1'],
    ]);
    expect(keys?.has('acme/widgets#7')).toBe(true);
    expect(keys?.size).toBe(learnFixes.rows.length + 1);
  });

  it('is empty for an API that does not know the read yet: no fix has a Learn view', async () => {
    m.fixesCached.mockResolvedValueOnce(null);
    expect(await loadMergedFixKeys()).toEqual(new Set());
  });

  it('is null when any page cannot be read: the sitemap cannot tell which address is canonical', async () => {
    m.fixesCached.mockRejectedValueOnce(new Error('down'));
    expect(await loadMergedFixKeys()).toBeNull();
    m.fixesCached.mockResolvedValueOnce({ ...learnFixes, next: 'c1' }).mockRejectedValueOnce(new Error('down'));
    expect(await loadMergedFixKeys()).toBeNull();
    m.fixesCached.mockResolvedValueOnce({ ...learnFixes, next: 'c1' }).mockResolvedValueOnce(null);
    expect(await loadMergedFixKeys()).toBeNull();
  });

  it('walks as many fixes as the sitemap lists pages, and stops there', async () => {
    expect(FIX_SITEMAP_PAGES * 10).toBe(5000);
    m.fixesCached.mockResolvedValue({ ...learnFixes, next: 'more' });
    await loadMergedFixKeys();
    expect(m.fixesCached).toHaveBeenCalledTimes(FIX_SITEMAP_PAGES);
  });
});
