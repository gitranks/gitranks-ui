// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
const contribute = vi.hoisted(() => ({ readIssuesPage: vi.fn(), readIssueStatuses: vi.fn() }));
vi.mock('@/lib/contribute/actions', () => contribute);
const workspace = vi.hoisted(() => ({ resumeContributing: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => workspace);
const issues = vi.hoisted(() => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/issue-actions', () => issues);
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));

const { ContributeIssueList } = await import('./issue-list');
const { issue } = await import('@/lib/contribute/__fixtures__/contribute-overview');

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

  it('resumes a pause the person set, then reads the page again', async () => {
    workspace.resumeContributing.mockResolvedValueOnce({ ok: true, data: true });
    await render(
      <ContributeIssueList
        page={{ items: picks(1, 2), next: null, total: 2, computedAt: null }}
        agents={AGENTS}
        pausedByYou
      />,
    );
    await act(async () => button('Resume')?.click());
    expect(workspace.resumeContributing).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
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
