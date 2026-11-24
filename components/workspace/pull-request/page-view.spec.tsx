// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const actions = vi.hoisted(() => ({
  approveRepliesAsOneComment: vi.fn(),
  approveReply: vi.fn(),
  discardAttempt: vi.fn(),
  fixPullRequest: vi.fn(),
  hidePrNote: vi.fn(),
  retryAttempt: vi.fn(),
  sendBackToAgent: vi.fn(),
  setPrTimeline: vi.fn(),
  startFollowUp: vi.fn(),
  vetoAutopilot: vi.fn(),
}));
const learnActions = vi.hoisted(() => ({ removeLesson: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/workspace/actions', () => actions);
vi.mock('@/lib/learn/actions', () => learnActions);
vi.mock('@/lib/workspace/pull-request.actions', () => ({
  markCommentAsksAction: vi.fn(),
  markRoundNotNeededAction: vi.fn(),
  reopenRoundAction: vi.fn(),
  sendRoundAction: vi.fn(),
  setReplyAction: vi.fn(),
}));
vi.mock('@/lib/workspace/use-changes', () => ({ useFastChanges: () => {} }));
vi.mock('@/components/workspace/use-grant-github', () => ({
  useGrantGithub: () => ({ grant: vi.fn(), pending: false }),
}));

const { PullRequestPageView } = await import('./page-view');
const { PrNotesPanel } = await import('./pr-notes');
const { WalkthroughTakeDown } = await import('./walkthrough-take-down');
const { prPage, prLinks } = await import('@/lib/workspace/__fixtures__/pull-request');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  for (const mock of [...Object.values(actions), ...Object.values(learnActions), router.refresh, router.push]) {
    mock.mockReset();
  }
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

const NOW = new Date('2026-11-24T12:00:00Z');
const REF = { owner: 'acme', repo: 'widgets', issue: 42, attempt: 'A_1' };
const OPS = {
  attemptId: 'A_1',
  prId: null,
  runId: null,
  walkthroughSendBack: 'yes' as const,
  retryId: null,
  discard: false,
  failedReplies: null,
  timeline: null,
  returnTo: '/my/pull-requests/acme/widgets/42' as never,
};
type Ops = Parameters<typeof PullRequestPageView>[0]['ops'];

const draw = (node: ReactNode) => act(async () => root.render(node));
const page = (patch: Parameters<typeof prPage>[0], ops: Partial<Ops> = {}, extra: object = {}) =>
  draw(
    <PullRequestPageView
      page={prPage({ attemptId: 'A_1', repo: 'acme/widgets', issueNumber: 42, ...patch })}
      now={NOW}
      refInput={REF}
      links={prLinks}
      fixUrl={null}
      ops={{ ...OPS, ...ops }}
      {...extra}
    />,
  );
const button = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find((each) =>
    each.textContent?.trim().startsWith(label),
  ) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No control');
    element.click();
  });
const type = (field: HTMLTextAreaElement | null, value: string) =>
  act(async () => {
    if (!field) throw new Error('No field');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
const dialog = () => document.querySelector<HTMLElement>('[role="alertdialog"]');

describe("the pull request page keeps today's actions", () => {
  it('discards a fix only after the person says yes, and never while it is being opened', async () => {
    actions.discardAttempt.mockResolvedValue({ ok: true, data: null });
    await page({ box: 'WALKTHROUGH', number: null }, { discard: true });
    await press(button('Discard this fix'));
    expect(actions.discardAttempt).not.toHaveBeenCalled();
    expect(dialog()?.textContent).toContain('Discard this fix?');
    await press(
      [...(dialog()?.querySelectorAll('button') ?? [])].find((each) => each.textContent === 'Discard') ?? null,
    );
    expect(actions.discardAttempt).toHaveBeenCalledWith('A_1');
    expect(router.refresh).toHaveBeenCalled();

    await page({ box: 'OPENING', number: null }, { discard: true });
    expect(button('Discard this fix')).toBeNull();
  });

  it('hides the public page, and shows it again from the same line', async () => {
    const timeline = { nameWithOwner: 'acme/widgets', number: 57, shown: true };
    actions.setPrTimeline.mockResolvedValue({ ok: true, data: { shown: false } });
    await page({ box: 'OPEN', number: 57 }, { timeline });
    expect(container.querySelector('[data-public-page]')?.getAttribute('data-public-page')).toBe('shown');
    await press(button('Hide its public page'));
    expect(actions.setPrTimeline).toHaveBeenLastCalledWith({
      attemptId: 'A_1',
      shown: false,
      nameWithOwner: 'acme/widgets',
      number: 57,
    });
    expect(container.querySelector('[data-public-page]')?.getAttribute('data-public-page')).toBe('hidden');
    actions.setPrTimeline.mockResolvedValue({ ok: true, data: { shown: true } });
    await press(button('Show its public page again'));
    expect(actions.setPrTimeline).toHaveBeenLastCalledWith(expect.objectContaining({ shown: true }));
    expect(button('Hide its public page')).not.toBeNull();
  });

  it('tries again with a note for the agent, or without one', async () => {
    actions.retryAttempt.mockResolvedValue({ ok: true, data: { attemptId: 'A_2' } });
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    const field = document.querySelector<HTMLTextAreaElement>('[data-note-form] textarea');
    expect(field?.getAttribute('aria-label')).toBe('A note for the agent');
    await type(field, 'Run the tests with --runInBand.');
    await press(document.querySelector<HTMLButtonElement>('[data-note-form] button[type="submit"]'));
    expect(actions.retryAttempt).toHaveBeenCalledWith('A_1', 'Run the tests with --runInBand.');
    expect(router.push).toHaveBeenCalledWith('/my/pull-requests/by-attempt/A_2');

    // The form closed with the call: it opens again from the box.
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    await press(document.querySelector<HTMLButtonElement>('[data-note-form] button[type="submit"]'));
    expect(actions.retryAttempt).toHaveBeenLastCalledWith('A_1', undefined);
  });

  it('opens a form in a dialog over the page, and gives the focus back to the box when it closes', async () => {
    // The next frame, run once the dialog is gone, as a browser does.
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((run) => {
      frames.push(run);
      return 0;
    });
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    // Over the page, not in it: nothing under the box moves.
    expect(container.querySelector('[data-note-form]')).toBeNull();
    expect(document.querySelector('[role="dialog"] [data-note-form]')).not.toBeNull();
    await press(button('Keep it as it is'));
    expect(document.querySelector('[data-note-form]')).toBeNull();
    for (const run of frames.splice(0)) run(0);
    expect(document.activeElement?.textContent).toMatch(/^Try again/);
    vi.restoreAllMocks();
  });

  it("says a failed call's error in the dialog, not under the box, and drops it with the form", async () => {
    actions.retryAttempt.mockResolvedValue({ ok: false, error: 'UNKNOWN', message: 'It broke.' });
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    await press(document.querySelector<HTMLButtonElement>('[data-note-form] button[type="submit"]'));
    expect(document.querySelector('[role="dialog"] [data-pr-error]')).not.toBeNull();
    expect(container.querySelector('[data-pr-error]')).toBeNull();
    await press(button('Keep it as it is'));
    expect(document.querySelector('[data-pr-error]')).toBeNull();
  });

  it('closes the form once a retry is under way, even when the next address draws this page', async () => {
    actions.retryAttempt.mockResolvedValue({ ok: true, data: { attemptId: 'A_1' } });
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    await press(document.querySelector<HTMLButtonElement>('[data-note-form] button[type="submit"]'));
    expect(router.push).toHaveBeenCalled();
    expect(document.querySelector('[data-note-form]')).toBeNull();
  });

  it('leaves a form whose action the page no longer offers', async () => {
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    expect(document.querySelector('[data-note-form]')).not.toBeNull();
    await page({ box: 'STOPPED', number: null }, { retryId: null });
    expect(document.querySelector('[data-note-form]')).toBeNull();
  });

  it('keeps the form while its call runs: no close button, Escape does nothing', async () => {
    let finish: (value: unknown) => void = () => {};
    actions.retryAttempt.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await page({ box: 'STOPPED', number: null }, { retryId: 'A_1' });
    await press(button('Try again'));
    expect(document.querySelector('[data-slot="dialog-close"]')).not.toBeNull();
    await press(document.querySelector<HTMLButtonElement>('[data-note-form] button[type="submit"]'));
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull();
    await act(async () => {
      document
        .querySelector('[role="dialog"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.querySelector('[data-note-form]')).not.toBeNull();
    await act(async () => finish({ ok: false, error: 'UNKNOWN', message: 'It broke.' }));
  });

  it('draws the notes and the take-down where the page gives them', async () => {
    await page({ box: 'OPEN', number: 57 }, {}, { maintainers: <p data-notes="" />, takeDown: <p data-down="" /> });
    expect(container.querySelector('[data-notes]')).not.toBeNull();
    expect(container.querySelector('[data-down]')).not.toBeNull();
  });
});

describe("a maintainer's “this PR helped” notes", () => {
  const note = (feedbackId: string, hidden = false) => ({
    feedbackId,
    login: 'mona',
    role: 'MAINTAINER' as const,
    likes: [],
    word: 'Clean fix, thanks.',
    at: '2026-11-20T10:00:00Z',
    hidden,
  });

  it('hides a note, and shows the hidden ones again', async () => {
    actions.hidePrNote.mockImplementation(async (id: string, hidden: boolean) => ({
      ok: true,
      data: note(id, hidden),
    }));
    await draw(<PrNotesPanel notes={{ stopped: null, notes: [note('F_1')] }} />);
    const hide = container.querySelector<HTMLButtonElement>('[data-note="F_1"] button');
    expect(hide?.getAttribute('aria-label')).toBe('Hide mona’s note');
    await press(hide);
    expect(actions.hidePrNote).toHaveBeenCalledWith('F_1', true);
    expect(container.querySelector('[data-hidden-notes]')?.textContent).toContain('1 hidden');
    await press(button('Show'));
    expect(actions.hidePrNote).toHaveBeenLastCalledWith('F_1', false);
    expect(container.querySelector('[data-note="F_1"]')).not.toBeNull();
  });
});

describe('taking a walkthrough down', () => {
  it('asks first, then takes it down for good', async () => {
    learnActions.removeLesson.mockResolvedValue({ ok: true, data: true });
    await draw(<WalkthroughTakeDown slug="retry-list-1x" />);
    await press(button('Take the walkthrough down'));
    expect(learnActions.removeLesson).not.toHaveBeenCalled();
    expect(dialog()?.textContent).toContain('Take this walkthrough down?');
    await press(
      [...(dialog()?.querySelectorAll('button') ?? [])].find((each) => each.textContent === 'Take it down') ?? null,
    );
    expect(learnActions.removeLesson).toHaveBeenCalledWith('retry-list-1x');
    expect(router.refresh).toHaveBeenCalled();
  });
});
