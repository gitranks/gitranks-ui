// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IssuesScreenProps } from './issues-screen';

/*
 * A skip's read in the browser, the screen left out: what the list holds once the reads land, in whatever order. The
 * screen is a stand-in that keeps the props it was last drawn with.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn() }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
const drawn = vi.hoisted(() => ({ props: null as IssuesScreenProps | null }));
vi.mock('@/components/learn/issues/issues-screen', () => ({
  IssuesScreen: (props: IssuesScreenProps) => {
    drawn.props = props;
    return null;
  },
}));

const { IssuesLive } = await import('./issues-live');
const { ISSUES_VIEW } = await import('@/lib/learn/issues');
const { issueRows, personalList, views } = await import('@/lib/learn/__fixtures__/issues');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
/** The reads the page made, each answered by the spec when it chooses. */
let asks: { url: string; answer: (body: unknown, status?: number) => Promise<void> }[];

beforeEach(() => {
  container = document.createElement('div');
  root = createRoot(container);
  drawn.props = null;
  asks = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string) =>
        new Promise<Response>((resolve) => {
          asks.push({
            url,
            answer: (body, status = 200) =>
              act(async () => {
                resolve(new Response(JSON.stringify(body), { status }));
              }),
          });
        }),
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

const rowWith = (id: string) => ({ ...issueRows[0], issue: maskedIssue({ id }) });
const ids = () => {
  const layer = drawn.props?.layer;
  return layer?.kind === 'personal' ? layer.list.rows.map((row) => row.issue.id) : null;
};
const skip = (id: string, next = maskedIssue({ id: `next-${id}` })) =>
  act(async () => drawn.props?.onSkipped?.(id, next));
const [a, b, c, d, e] = issueRows.map((row) => row.issue.id);

/** The person's five for the view, read and drawn. */
async function shown(view = ISSUES_VIEW) {
  await act(async () => root.render(<IssuesLive view={view} initial={{ kind: 'visitor', rows: [] }} />));
  await asks[asks.length - 1].answer({ state: 'ok', list: personalList(), reads: null });
}

describe("a skip's read", () => {
  it('drops a read made for the view the person has left', async () => {
    await shown();
    await skip(a);
    const skipRead = asks[asks.length - 1];
    await act(async () => root.render(<IssuesLive view={views.learned} initial={{ kind: 'visitor', rows: [] }} />));
    const viewRead = asks[asks.length - 1];
    expect(viewRead.url).toBe('/api/me/learn/issues?learned=1');
    await viewRead.answer({ state: 'ok', list: personalList({ rows: issueRows.slice(1) }), reads: null });
    // The old view's read lands late: the new view's list stays as it was read.
    await skipRead.answer({
      state: 'ok',
      list: personalList({ rows: [rowWith('fresh001'), ...issueRows] }),
      reads: null,
    });
    expect(ids()).toEqual([b, c, d, e]);
  });

  it('applies the later of two quick skips, drops the earlier read landing after it, and never brings a skipped row back', async () => {
    await shown();
    await skip(a);
    await skip(b);
    const [first, second] = asks.slice(-2);
    // The second read answers first: both skipped rows give way, in their places.
    await second.answer({
      state: 'ok',
      list: personalList({
        rows: [issueRows[2], issueRows[3], issueRows[4], rowWith('fresh001'), rowWith('fresh002')],
      }),
      reads: null,
    });
    expect(ids()).toEqual(['fresh001', 'fresh002', c, d, e]);
    // The first, older, lands after it: dropped, and the row skipped second does not come back.
    await first.answer({ state: 'ok', list: personalList({ rows: [issueRows[1], rowWith('fresh003')] }), reads: null });
    expect(ids()).toEqual(['fresh001', 'fresh002', c, d, e]);
  });

  it('removes the row when the read has nothing new, and takes the next issue only when the read failed', async () => {
    await shown();
    await skip(a);
    await asks[asks.length - 1].answer({ state: 'ok', list: personalList({ rows: issueRows.slice(1) }), reads: null });
    expect(ids()).toEqual([b, c, d, e]);
    await skip(b, maskedIssue({ id: 'next0001' }));
    await asks[asks.length - 1].answer({}, 500);
    expect(ids()).toEqual(['next0001', c, d, e]);
  });
});
