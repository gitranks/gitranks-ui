// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const masked = vi.hoisted(() => ({ lookAtIssue: vi.fn(), signInToSeeIssue: vi.fn(), skipMaskedIssue: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => masked);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
vi.mock('@/lib/learn/actions', () => ({ readPracticeNext: vi.fn() }));

const { PracticeNextCard } = await import('./practice-next');
const { OwnerIssueRows } = await import('@/app/profile/[login]/components/profile-contribute-block');
const { CONNECTED_ISSUES } = await import('@/app/profile/[login]/__fixtures__/contribute-owner');
const { learnIssues } = await import('@/lib/learn/__fixtures__/home');
const { learnIssueOfMasked } = await import('@/lib/learn/masked-rows');
const { maskedIssues } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const click = (label: string) =>
  act(async () => {
    const element = [...container.querySelectorAll<HTMLElement>('button')].find(
      (each) => each.textContent?.trim() === label,
    );
    if (!element) throw new Error(`No button "${label}"`);
    element.click();
  });
const maskIds = () =>
  [...container.querySelectorAll('[data-masked-row]')].map((row) => row.getAttribute('data-masked-row'));
const emptyItems = () => [...container.querySelectorAll('li')].filter((item) => !item.textContent?.trim());
const gone = { ok: true, data: { outcome: 'LEFT_POOL', page: null } };

describe("a passed practice lesson's masked issues", () => {
  const card = () =>
    render(
      <PracticeNextCard
        next={{
          current: null,
          issues: learnIssues({ items: [learnIssueOfMasked(maskedIssues[0]), learnIssues().items[0]] }),
        }}
      />,
    );

  it("puts a skip's next issue in the row's place", async () => {
    masked.skipMaskedIssue.mockResolvedValueOnce({ ok: true, data: maskedIssues[2] });
    await card();
    expect(maskIds()).toEqual(['q7k2m9xa']);
    await click('Skip');
    await click('Too hard for me');
    expect(maskIds()).toEqual(['t5w0c4hy']);
  });

  it('drops a row that leaves, with no empty place, and keeps the line on why', async () => {
    masked.lookAtIssue.mockResolvedValueOnce(gone);
    await card();
    await click('See the full issue');
    expect(maskIds()).toEqual([]);
    expect(emptyItems()).toEqual([]);
    expect(container.querySelector('[data-list-status]')?.textContent).toBe(
      'That issue is no longer open, so it left your list.',
    );
  });
});

describe("the owner's masked picks on their profile", () => {
  const rows = () =>
    render(
      <OwnerIssueRows
        issues={[{ ...CONNECTED_ISSUES[0], masked: maskedIssues[0] }, CONNECTED_ISSUES[1]]}
        from="contribute"
      />,
    );

  it("puts a skip's next issue in the row's place", async () => {
    masked.skipMaskedIssue.mockResolvedValueOnce({ ok: true, data: maskedIssues[2] });
    await rows();
    await click('Skip');
    await click('Not interesting to me');
    expect(maskIds()).toEqual(['t5w0c4hy']);
    expect(masked.skipMaskedIssue).toHaveBeenCalledWith('q7k2m9xa', 'profile', 'NOT_INTERESTING', []);
  });

  it('drops a row that leaves, and keeps the foot with the line on why', async () => {
    masked.lookAtIssue.mockResolvedValueOnce(gone);
    await rows();
    await click('See the full issue');
    expect(maskIds()).toEqual([]);
    expect(container.querySelectorAll('article[data-issue]')).toHaveLength(1);
    expect(container.querySelector('[data-masked-foot]')).not.toBeNull();
  });
});
