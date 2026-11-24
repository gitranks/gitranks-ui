// @vitest-environment jsdom
import type { Route } from 'next';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullRequestListView, type PullRequestListViewProps } from './pr-list';
import { PR_NOW, prLists } from '@/lib/workspace/__fixtures__/pull-request';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No control');
    element.click();
  });
const view = (props: Partial<PullRequestListViewProps> = {}) =>
  render(
    <PullRequestListView
      list={prLists.contribute}
      now={PR_NOW}
      side="contribute"
      issuesHref={'/contribute' as Route}
      hrefOf={(row) => `/my/pull-requests/${row.repo}/${row.issueNumber}` as Route}
      lessonHrefOf={(lesson) => `/learn/lessons/${lesson.slug}` as Route}
      {...props}
    />,
  );
const headings = () => [...container.querySelectorAll('h2')].map((h2) => h2.textContent);
const rowOf = (index: number) => container.querySelectorAll<HTMLElement>('[data-pr-row]')[index];
const rowButton = (index: number) => rowOf(index)?.querySelector<HTMLAnchorElement>('[data-slot="button"]') ?? null;

describe('the list of pull requests', () => {
  it('has the limit line, then three groups by who has to act, and no visible title', async () => {
    await view();
    expect(container.querySelector('h1')?.className).toBe('sr-only');
    expect(container.querySelector('[data-limit-line]')?.textContent).toBe(
      '3 of 8 open at a time · Change in Settings',
    );
    expect(headings()).toEqual(['Needs you3', 'In progress2', 'Ended']);
    expect(container.querySelectorAll('[data-pr-row]')).toHaveLength(9);
  });

  it('gives only the first row the filled button and the Enter key', async () => {
    await view();
    expect(rowButton(0)?.getAttribute('data-variant')).toBe('default');
    expect(rowButton(0)?.textContent).toContain('⏎');
    expect(rowButton(1)?.getAttribute('data-variant')).toBe('outline');
    const clicked = vi.fn((event: Event) => event.preventDefault());
    rowButton(0)?.addEventListener('click', clicked);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(clicked).toHaveBeenCalledOnce();
  });

  it("draws a row: the project's links, the title to its page, the line with its mark, the facts and one button", async () => {
    await view();
    const first = rowOf(0);
    expect(first.textContent).toContain('kelp-db/kelp');
    expect(first.textContent).toContain('Issue #1400');
    expect(first.textContent).toContain('PR #1419');
    const title = [...first.querySelectorAll('a')].find((a) => a.textContent === 'Add a --json flag to kelp status');
    expect(title?.getAttribute('href')).toBe('/my/pull-requests/kelp-db/kelp/1400');
    expect(first.querySelector('[data-row-line]')?.textContent).toBe('Round 2: something to answer');
    expect(first.querySelector('[data-mark]')?.getAttribute('data-mark')).toBe('NEEDS_YOU');
    expect(first.textContent).toContain('Needs you');
    expect(first.querySelector('[data-row-agent]')?.textContent).toBe('Hosted agent · $3.12');
    expect(rowButton(0)?.textContent).toContain('See what was asked');
    expect(rowOf(1).querySelector('[data-row-lesson] a')?.getAttribute('href')).toBe('/learn/lessons/a-hash-map');
  });

  it('marks an agent at work with a ring, the maintainers’ move with a grey dot, a merge with a check', async () => {
    await view();
    expect(rowOf(3).querySelector('[data-mark]')?.getAttribute('data-mark')).toBe('AGENT_WORKING');
    expect(rowOf(3).querySelector('[data-row-line]')?.textContent).toBe('The hosted agent is fixing the issue');
    expect(rowOf(4).querySelector('[data-mark]')?.getAttribute('data-mark')).toBe('MAINTAINERS');
    expect(rowOf(5).querySelector('[data-mark]')?.getAttribute('data-mark')).toBe('MERGED');
    expect(rowOf(5).querySelector('[data-row-line]')?.textContent).toBe('Merged on 26 Oct');
    expect(rowOf(7).querySelector('[data-mark]')).toBeNull();
  });

  it('shows 20 more of "Ended" in place', async () => {
    const onMore = vi.fn();
    await view({ onMore });
    const more = [...container.querySelectorAll('button')].find((each) => each.textContent === 'Show 20 more');
    await press(more ?? null);
    expect(onMore).toHaveBeenCalledWith('cursor_20');
    await view({ onMore, loadingMore: true });
    expect(
      [...container.querySelectorAll('button')].find((each) => each.textContent === 'Showing more…')?.disabled,
    ).toBe(true);
    await view({ onMore, list: prLists.learn });
    expect(container.textContent).not.toContain('Show 20 more');
  });

  it('leaves out a group with nothing in it, with its heading', async () => {
    await view({ list: { ...prLists.learn, rows: prLists.learn.rows.filter((row) => row.group !== 'NEEDS_YOU') } });
    expect(headings()).toEqual(['In progress1', 'Ended']);
    expect(rowButton(0)?.getAttribute('data-variant')).toBe('default');
  });

  it('keeps the row of a fix whose public page was removed, without a link to it or a button', async () => {
    await view({ list: prLists.every });
    const removed = container.querySelectorAll<HTMLElement>('[data-pr-row]')[14];
    expect(removed.textContent).toContain('Page removed');
    expect([...removed.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
      'Issue #1290↗(opens GitHub)',
      'PR #1302↗(opens GitHub)',
    ]);
    expect(removed.querySelector('[data-mark]')?.getAttribute('data-mark')).toBe('REMOVED');
  });

  it('says at the limit that no new fix can start', async () => {
    await view({ list: prLists.atLimit });
    expect(container.querySelector('[data-limit-line]')?.textContent).toBe(
      '8 of 8 open: no new fix can start until one is merged or closed. Change in Settings',
    );
  });

  it('is one box with no fix at all, leading to the issues of the side the person came from', async () => {
    await view({ list: prLists.empty, side: 'learn', issuesHref: '/learn/issues' as Route });
    expect(container.querySelector('[data-limit-line]')).toBeNull();
    const box = container.querySelector('[data-pr-empty="learn"]');
    expect(box?.textContent).toContain('you answer a few questions about the fix');
    expect(box?.querySelector('a')?.textContent).toBe('See the issues for you');
    expect(box?.querySelector('a')?.getAttribute('href')).toBe('/learn/issues');
    await view({ list: prLists.empty });
    expect(container.querySelector('[data-pr-empty="contribute"] a')?.textContent).toBe('Find an issue');
  });
});
