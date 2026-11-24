// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { moreEndedAction } = vi.hoisted(() => ({ moreEndedAction: vi.fn() }));
vi.mock('@/lib/workspace/pull-request.actions', () => ({ moreEndedAction }));

const { PullRequestListPageView } = await import('./list-view');
const { prList, prRow } = await import('@/lib/workspace/__fixtures__/pull-request');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  moreEndedAction.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const NOW = new Date('2026-11-24T12:00:00Z');
const draw = (list: ReturnType<typeof prList>) =>
  act(async () =>
    root.render(<PullRequestListPageView list={list} now={NOW} side="contribute" issuesHref="/contribute#issues" />),
  );
const rows = () => [...container.querySelectorAll<HTMLElement>('[data-pr-row]')].map((row) => row.dataset.prRow);
const showMore = () =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((each) => each.textContent?.startsWith('Show'));

describe('the list of pull requests, read again', () => {
  it("draws each new read's rows at once, and the rows Show more added go with the read they extended", async () => {
    const fixing = prRow('FIXING', { attemptId: 'A_1', made: 'CONTRIBUTE' });
    const ended = prRow('CLOSED', { attemptId: 'A_9', made: 'CONTRIBUTE' });
    const first = prList({ rows: [fixing, ended], more: 'cursor_20' });
    await draw(first);
    expect(rows()).toEqual(['A_1', 'A_9']);

    moreEndedAction.mockResolvedValue({
      ok: true,
      data: prList({ rows: [prRow('DISCARDED', { attemptId: 'A_10', made: 'CONTRIBUTE' })], more: null }),
    });
    await act(async () => showMore()?.click());
    expect(moreEndedAction).toHaveBeenCalledWith('cursor_20');
    expect(rows()).toEqual(['A_1', 'A_9', 'A_10']);
    expect(showMore()).toBeUndefined();

    // The poll read the page again: the fix moved on to the walkthrough, and the read's own rows are drawn.
    const moved = prRow('APPROVE', { attemptId: 'A_1', made: 'CONTRIBUTE' });
    await draw(prList({ rows: [moved, ended], more: 'cursor_20' }));
    expect(container.querySelector('[data-pr-row="A_1"]')?.getAttribute('data-row-box')).toBe('APPROVE');
    expect(rows()).toEqual(['A_1', 'A_9']);
    expect(showMore()).toBeDefined();
  });
});
