// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ lookAtIssue: vi.fn(), signInToSeeIssue: vi.fn(), skipMaskedIssue: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => actions);

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
const contribute = vi.hoisted(() => ({ readIssuesPage: vi.fn(), readIssueStatuses: vi.fn() }));
vi.mock('@/lib/contribute/actions', () => contribute);
const issues = vi.hoisted(() => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/issue-actions', () => issues);
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));

const { ContributeIssueList } = await import('./issue-list');
const { issue } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { looksToday, maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  contribute.readIssueStatuses.mockResolvedValue({ ok: true, data: [] });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const picks = (from: number, count: number) =>
  Array.from({ length: count }, (_, at) => issue({ issueId: `I_${from + at}`, number: from + at, rank: from + at }));
const AGENTS = { hosted: true, own: false };
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((each) => each.textContent?.trim() === label) ?? null;

describe("Contribute's list with masked issues", () => {
  const masked = (id: string, title: string) => ({ ...maskedIssue(), id, title });
  const PAGE = {
    items: [
      issue({ issueId: 'I_1', number: 1, rank: 1 }),
      issue({
        issueId: 'mask:q7k2m9xa',
        nameWithOwner: 'hidden-org/hidden-repo',
        number: 2,
        rank: 2,
        masked: masked('q7k2m9xa', 'Tags show twice'),
      }),
    ],
    next: null,
    total: 2,
    computedAt: '2026-10-28T07:00:00.000Z',
  };
  const LIVE = { looks: looksToday(), numbers: { read: 10, kept: 2 } };

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });

  it("shows a masked issue as its masked row beside today's named rows, with the foot under them", async () => {
    await render(<ContributeIssueList page={PAGE} agents={AGENTS} masked={LIVE} />);
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(1);
    const row = container.querySelector('[data-masked-row="q7k2m9xa"]');
    expect(row?.textContent).toContain('Tags show twice');
    expect(row?.textContent).toContain('See the full issue');
    // Nothing of the masked issue's project reaches the row.
    expect(container.textContent).not.toContain('hidden-org/hidden-repo');
    expect(container.querySelector('[data-masked-foot]')).not.toBeNull();
    expect(container.querySelector('[data-looks-line]')?.textContent).toBe(
      'You can see 20 full issues a day. 17 left today.',
    );
    // The live region names a masked issue by its rewritten title alone.
    expect(container.querySelector('[role="status"].sr-only')?.textContent).not.toContain('hidden-org');
  });

  it('asks the status poll about named rows only', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await render(<ContributeIssueList page={PAGE} agents={AGENTS} masked={LIVE} />);
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    for (const [ids] of contribute.readIssueStatuses.mock.calls) expect(ids).not.toContain('mask:q7k2m9xa');
    vi.useRealTimers();
  });

  it('has no masked row and no foot when no issue is masked', async () => {
    await render(<ContributeIssueList page={{ ...PAGE, items: [PAGE.items[0]] }} agents={AGENTS} masked={LIVE} />);
    expect(container.querySelector('[data-masked-row]')).toBeNull();
    expect(container.querySelector('[data-masked-foot]')).toBeNull();
  });

  it('takes a masked row out of the feed when its issue is gone', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'LEFT_POOL', page: null } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await render(<ContributeIssueList page={PAGE} agents={AGENTS} masked={LIVE} />);
    await act(async () => button('See the full issue')?.click());
    // It says why for a moment, then folds away as a taken row does.
    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    vi.useRealTimers();
    expect(container.querySelector('[data-masked-row]')).toBeNull();
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(1);
    // The last masked row folded: the foot stays, and still says why it left.
    expect(container.querySelector('[data-masked-foot]')).not.toBeNull();
    expect(container.querySelector('[data-list-status]')?.textContent).toBe(
      'That issue is no longer open, so it left your list.',
    );
  });
});

describe("Contribute's issue list", () => {
  it('grows by 10 in place with "Show 10 more", read under the same filters', async () => {
    contribute.readIssuesPage.mockResolvedValueOnce({
      ok: true,
      data: { items: picks(11, 10), next: 'c3', total: 25, computedAt: null },
    });
    await render(
      <ContributeIssueList
        page={{ items: picks(1, 10), next: 'c2', total: 25, computedAt: '2026-10-28T07:00:00.000Z' }}
        agents={AGENTS}
        filter={{ language: 'RUST', size: 'M' }}
      />,
    );
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(10);
    expect(container.textContent).toContain('Showing 10 of 25 issues');
    await act(async () => button('Show 10 more')?.click());
    expect(contribute.readIssuesPage).toHaveBeenCalledWith({
      filter: { languages: ['RUST'], maxSize: 'M' },
      after: 'c2',
      first: 10,
    });
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(20);
    expect(container.textContent).toContain('Showing 20 of 25 issues');
    expect(button('Show 5 more')).not.toBeNull();
  });

  it('keeps its grown rows through a refresh, and starts again at 10 under other filters', async () => {
    contribute.readIssuesPage.mockResolvedValueOnce({
      ok: true,
      data: { items: picks(11, 10), next: 'c3', total: 25, computedAt: null },
    });
    const first = { items: picks(1, 10), next: 'c2', total: 25, computedAt: '2026-10-28T07:00:00.000Z' };
    const list = (page: typeof first, filter = {}) => (
      <ContributeIssueList page={page} agents={AGENTS} filter={filter} />
    );
    await render(list(first));
    await act(async () => button('Show 10 more')?.click());
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(20);
    // The page read again (a refresh): the same first page, a new object.
    await render(list({ ...first, items: picks(1, 10) }));
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(20);
    expect(contribute.readIssuesPage).toHaveBeenCalledTimes(1);
    // Other filters: another list, its first 10.
    await render(list({ ...first, items: picks(1, 10) }, { language: 'GO' }));
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(10);
    expect(container.textContent).toContain('Showing 10 of 25 issues');
  });

  it('reads the page again when a Start meets the limit, so it shows the limit state', async () => {
    issues.startIssue.mockResolvedValueOnce({
      ok: true,
      data: { attempt: null, started: false, refusal: 'LIMIT_REACHED', value: 3, holder: null, until: null },
    });
    await render(
      <ContributeIssueList page={{ items: picks(1, 2), next: null, total: 2, computedAt: null }} agents={AGENTS} />,
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[data-start-control="hosted"]')?.click());
    expect(refresh).toHaveBeenCalled();
  });

  it("says why a paused account's Start can't run, with the key as the way on (no Resume)", async () => {
    issues.startIssue.mockResolvedValueOnce({
      ok: true,
      data: { attempt: null, started: false, refusal: 'KEY_INVALID', value: null, holder: null, until: null },
    });
    await render(
      <ContributeIssueList page={{ items: picks(1, 2), next: null, total: 2, computedAt: null }} agents={AGENTS} />,
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[data-start-control="hosted"]')?.click());
    expect(container.textContent).toContain('Your Claude key stopped working. Nothing can start on it.');
    const replace = [...container.querySelectorAll('a')].find((link) => link.textContent?.includes('Replace the key'));
    expect(replace?.getAttribute('href')).toBe('/my/agent/key?replace=1');
    expect(container.textContent).not.toContain('Resume');
  });

  it('can be placed without its menu, and shows no Start at the limit', async () => {
    const page = { items: picks(1, 2), next: null, total: 2, computedAt: null };
    await render(<ContributeIssueList page={page} agents={AGENTS} menu={false} />);
    expect(container.querySelector('[data-row-menu]')).toBeNull();
    expect(container.querySelectorAll('[data-start-control]')).toHaveLength(2);
    await render(<ContributeIssueList page={page} agents={AGENTS} limit={{ count: 3, limit: 3 }} />);
    expect(container.querySelector('[data-limit-notice="3"]')).not.toBeNull();
    expect(container.querySelector('[data-start-control]')).toBeNull();
    expect(container.querySelectorAll('[data-row-menu]')).toHaveLength(2);
  });
});
