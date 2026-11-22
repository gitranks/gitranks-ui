// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APPLICATIONS, boardWithApplications, candidateOf, liveCheckOf } from '../__fixtures__/board';
import type { AdminCheck, AdminState } from '../admin-state';

vi.mock('server-only', () => ({}));
vi.mock('../actions', () => ({ pressAdmin: vi.fn(async (state: AdminState) => state) }));

const { AdminPanel } = await import('./admin-panel');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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

/** The owner's own application, and a shortlist row of the same repository. */
const OWNER = APPLICATIONS.inReview[3];
const SAME_REPO_ROW = candidateOf({
  position: 3,
  repo: { githubId: OWNER.repo!.githubId, nameWithOwner: OWNER.repo!.nameWithOwner, createdAt: null },
  package: { registry: 'NPM', name: 'tiny-clamp' },
  misses: [],
});
const CHECK = liveCheckOf({ package: { registry: 'NPM', name: 'tiny-clamp' }, nameWithOwner: 'octocat/tiny-clamp' });

const stateWith = (check: AdminCheck): AdminState => {
  const board = boardWithApplications();
  return { board: { ...board, shortlist: [...board.shortlist, SAME_REPO_ROW] }, notice: null, check };
};

const dialogText = () => document.querySelector('[role="dialog"]')?.textContent ?? '';

/** The Schedule button of the row that names the repository, in the tab open now. */
const scheduleOf = (nameWithOwner: string) => {
  const row = [...document.querySelectorAll('tr')].find((each) => each.textContent?.includes(nameWithOwner));
  return [...(row?.querySelectorAll('button') ?? [])].find((each) => each.textContent === 'Schedule') as HTMLElement;
};

const press = (element: Element, event: 'click' | 'mousedown' = 'click') =>
  act(async () => {
    element.dispatchEvent(new MouseEvent(event, { bubbles: true, button: 0 }));
  });

const close = () =>
  press([...document.querySelectorAll('[role="dialog"] button')].find((each) => each.textContent === 'Close')!);

const openApplications = () =>
  press(
    [...document.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent?.startsWith('Applications'))!,
    'mousedown',
  );

describe('which live check the Schedule dialog shows', () => {
  it('an application’s check reaches only that application’s dialog, never the shortlist row of its repository', async () => {
    await act(async () =>
      root.render(
        <AdminPanel
          initial={stateWith({
            repoGithubId: OWNER.repo!.githubId,
            applicationId: OWNER.id,
            check: CHECK,
            refusal: null,
          })}
        />,
      ),
    );
    await press(scheduleOf('octocat/tiny-clamp'));
    expect(dialogText()).toContain('No live check yet.');
    expect(dialogText()).not.toContain('From an application.');
    await close();

    await openApplications();
    await press(scheduleOf('octocat/tiny-clamp'));
    expect(dialogText()).toContain('From an application.');
    expect(dialogText()).toContain('for tiny-clamp');
    expect(dialogText()).not.toContain('No live check yet.');
    expect(document.querySelector('[role="dialog"] input[name="applicationId"]')).toHaveProperty('value', OWNER.id);
  });

  it('a shortlist row’s check never reaches the application’s dialog', async () => {
    await act(async () =>
      root.render(
        <AdminPanel initial={stateWith({ repoGithubId: OWNER.repo!.githubId, check: CHECK, refusal: null })} />,
      ),
    );
    await press(scheduleOf('octocat/tiny-clamp'));
    expect(dialogText()).toContain('for tiny-clamp');
    expect(document.querySelector('[role="dialog"] input[name="applicationId"]')).toBeNull();
    await close();

    await openApplications();
    await press(scheduleOf('octocat/tiny-clamp'));
    expect(dialogText()).toContain('From an application.');
    expect(dialogText()).toContain('No live check yet.');
  });
});
