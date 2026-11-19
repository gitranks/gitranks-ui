// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
const issues = vi.hoisted(() => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/issue-actions', () => issues);
const pageActions = vi.hoisted(() => ({ readStartPageAttempt: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => pageActions);

const { IssueRow } = await import('./issue-row');
const { IssueStartsProvider } = await import('./start-control');
const { issue } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { issueRowOfContribute } = await import('@/lib/workspace/issue-row');

import type { IssueRowProps } from './issue-row';
import type { IssueStart } from '@/lib/workspace/issue-start';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  issues.startIssue.mockReset();
  pageActions.readStartPageAttempt.mockReset();
  push.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const answer = (patch: Partial<IssueStart>): IssueStart => ({
  attempt: null,
  started: false,
  refusal: null,
  value: null,
  holder: null,
  until: null,
  ...patch,
});
const ROW_A = issueRowOfContribute(issue());
const ROW_B = issueRowOfContribute(issue({ issueId: 'I_2', number: 930, nameWithOwner: 'tidewave/tide' }));
const HOSTED = { hosted: true, own: false };

const render = (node: ReactNode) => act(async () => root.render(<IssueStartsProvider>{node}</IssueStartsProvider>));
const row = (props: Partial<IssueRowProps> = {}, which = ROW_A) => (
  <IssueRow key={which.issueId} issue={which} side="contribute" agents={HOSTED} learnOpen {...props} />
);
const startOf = (issueId: string) =>
  container.querySelector<HTMLButtonElement>(`[data-issue="${issueId}"] [data-start-control]`);
const press = (button: HTMLElement | null) =>
  act(async () => {
    if (!button) throw new Error('No button');
    button.click();
  });
/** A promise the test settles. */
function later<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

describe("an issue row's hosted Start", () => {
  it('sends one start at a time: a second press sends nothing, the other rows are off until it is answered', async () => {
    const sent = later<{ ok: true; data: IssueStart }>();
    issues.startIssue.mockReturnValueOnce(sent.promise);
    await render(
      <>
        {row()}
        {row({}, ROW_B)}
      </>,
    );
    const start = startOf('I_1');
    start?.focus();
    await press(start);
    await press(startOf('I_1'));
    expect(issues.startIssue).toHaveBeenCalledTimes(1);
    expect(startOf('I_1')?.textContent).toContain('Starting…');
    // It keeps the focus: off for a second press, not disabled.
    expect(startOf('I_1')?.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(startOf('I_1'));
    expect(startOf('I_2')?.disabled).toBe(true);

    await act(async () => sent.settle({ ok: true, data: answer({ refusal: 'TRY_LATER' }) }));
    expect(startOf('I_2')?.disabled).toBe(false);
  });

  it("opens the run's pull request page", async () => {
    issues.startIssue.mockResolvedValueOnce({
      ok: true,
      data: answer({ started: true, attempt: { id: 'A_1', repo: 'quill-rs/quill', number: 1204, state: 'CLAIMING' } }),
    });
    await render(row());
    await press(startOf('I_1'));
    expect(push).toHaveBeenCalledWith('/my/pull-requests/quill-rs/quill/1204');
  });

  it('after a failed call reads the attempt once and opens a run it finds', async () => {
    issues.startIssue.mockRejectedValueOnce(new Error('timed out'));
    pageActions.readStartPageAttempt.mockResolvedValueOnce({
      ok: true,
      data: { id: 'A_9', mode: 'FIX', state: 'CLAIMING' },
    });
    await render(row());
    await press(startOf('I_1'));
    expect(pageActions.readStartPageAttempt).toHaveBeenCalledWith('quill-rs/quill', 1204);
    expect(push).toHaveBeenCalledWith('/my/pull-requests/quill-rs/quill/1204');
  });

  it('starts from the menu of two ways too', async () => {
    issues.startIssue.mockResolvedValueOnce({ ok: true, data: answer({ refusal: 'DAILY_LIMIT' }) });
    await render(row({ agents: { hosted: true, own: true } }));
    const trigger = startOf('I_1');
    await act(async () => {
      trigger?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
    });
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (each) => each.textContent === 'With the hosted agent',
    );
    await press(item ?? null);
    expect(issues.startIssue).toHaveBeenCalledWith('I_1');
    expect(container.textContent).toContain("You've started as many issues as one day allows.");
  });

  it('says a refusal where the focus was, tells the page, and keeps Try again in place while it is sent again', async () => {
    const onRefused = vi.fn();
    issues.startIssue.mockResolvedValueOnce({ ok: true, data: answer({ refusal: 'CLAIM_PENDING' }) });
    await render(row({ onRefused }));
    startOf('I_1')?.focus();
    await press(startOf('I_1'));
    const said = container.querySelector<HTMLElement>('[data-start-refusal="CLAIM_PENDING"]');
    expect(said?.textContent).toContain('Your last Start is still being checked.');
    expect(document.activeElement).toBe(said);
    expect(onRefused).toHaveBeenCalledWith(expect.objectContaining({ code: 'CLAIM_PENDING' }));

    const again = later<{ ok: true; data: IssueStart }>();
    issues.startIssue.mockReturnValueOnce(again.promise);
    const retry = [...container.querySelectorAll('button')].find((each) => each.textContent === 'Try again');
    retry?.focus();
    await press(retry ?? null);
    const sending = [...container.querySelectorAll('button')].find((each) => each.textContent === 'Trying again…');
    expect(sending?.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(sending);
    await act(async () => again.settle({ ok: true, data: answer({ refusal: 'LIMIT_REACHED', value: 3 }) }));
    expect(onRefused).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'LIMIT_REACHED' }));
    expect(container.querySelector('[data-limit-notice="3"]')).not.toBeNull();
  });

  it('folds the row once for an issue that is gone, saying why and nothing about another contributor', async () => {
    const onFold = vi.fn();
    const onTaken = vi.fn();
    issues.startIssue.mockResolvedValueOnce({ ok: true, data: answer({ refusal: 'CLOSED' }) });
    const live = () => ({ status: 'AVAILABLE' as const, attemptId: null, onFold, onTaken });
    await render(row({ live: live() }));
    await press(startOf('I_1'));
    // The list draws the row again with new callbacks: still once.
    await render(row({ live: live() }));
    expect(onFold).toHaveBeenCalledTimes(1);
    expect(onTaken).not.toHaveBeenCalled();
    expect(container.textContent).toContain('This issue was closed meanwhile.');
    expect(container.textContent).not.toContain('Taken by another contributor');
    expect(container.querySelector('[data-issue="I_1"]')?.getAttribute('data-gone')).toBe('true');
    expect(startOf('I_1')).toBeNull();
  });

  it('drops the Start and "Fix it and teach me" for a repo closed to us; the menu stays', async () => {
    issues.startIssue.mockResolvedValueOnce({ ok: true, data: answer({ refusal: 'REPO_UNAVAILABLE' }) });
    await render(row());
    await press(startOf('I_1'));
    expect(startOf('I_1')).toBeNull();
    const menu = container.querySelector<HTMLElement>('[data-row-menu]');
    expect(menu).not.toBeNull();
    await act(async () => {
      menu?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
    });
    const items = [...document.querySelectorAll('[role="menuitem"]')].map((each) => each.textContent);
    expect(items).toEqual(['Skip this issue']);
  });
});

describe('an issue row, placed', () => {
  it('keeps the menu at the limit (no Start), and leaves it out with menu={false}', async () => {
    await render(row({ control: false }));
    expect(startOf('I_1')).toBeNull();
    expect(container.querySelector('[data-row-menu]')).not.toBeNull();
    await render(row({ menu: false }));
    expect(container.querySelector('[data-row-menu]')).toBeNull();
    expect(startOf('I_1')).not.toBeNull();
  });

  it('offers "Fix it and teach me" where Learn is open', async () => {
    await render(row());
    await act(async () => {
      container
        .querySelector('[data-row-menu]')
        ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
    });
    const teach = [...document.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]')].find(
      (each) => each.textContent === 'Fix it and teach me',
    );
    expect(teach?.getAttribute('href')).toBe('/my/start/quill-rs/quill/1204?lesson=1&from=contribute');
  });
});
