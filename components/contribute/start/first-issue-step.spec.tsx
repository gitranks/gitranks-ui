// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/contribute/start/issue' }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
const mark = vi.hoisted(() => ({ markContributeOnboarded: vi.fn() }));
vi.mock('@/lib/workspace/onboarding.actions', () => mark);
const actions = vi.hoisted(() => ({ readFeedComputedAt: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => actions);
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
// The dialog has its own spec: here it is its trigger and a save that runs its two callbacks in order.
vi.mock('@/components/contribute/languages-dialog', () => ({
  LanguagesDialog: ({
    trigger,
    beforeSave,
    onSaved,
  }: {
    trigger: ReactNode;
    beforeSave: () => Promise<void>;
    onSaved: (draft: { languages: string[] }) => void;
  }) => (
    <>
      {trigger}
      <button
        type="button"
        data-save=""
        onClick={async () => {
          await beforeSave();
          onSaved({ languages: ['RUST'] });
        }}
      >
        Save
      </button>
    </>
  ),
}));

const { FirstIssueStep, MARK_FAILED_LINE } = await import('./first-issue-step');
const { StillRanking } = await import('@/app/contribute/components/still-ranking');
const { startWaysOf } = await import('@/lib/contribute/start-ways');
const { REPICK_GIVE_UP_MS, REPICK_POLL_MS } = await import('@/lib/contribute/start-flow');
const { StartControl } = await import('@/components/workspace/start-control');
const { startControlOf } = await import('@/lib/workspace/issue-row');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  window.history.replaceState(null, '', '/contribute/start/issue');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const NOTHING_CONNECTED = startWaysOf({
  signedIn: true,
  sign: false,
  own: null,
  key: 'none',
  attempt: false,
  issue: null,
  issueReads: false,
});

const leave = vi.fn();

function step({ needsMark = true, children }: { needsMark?: boolean; children?: ReactNode } = {}) {
  return (
    <FirstIssueStep
      mark={needsMark}
      head={{ title: 'Pick your first issue', text: 'Claude Code is connected.' }}
      languages={{ saved: null, profile: ['GO'], preferences: null }}
      nothingConnected={NOTHING_CONNECTED}
      picking={<div data-picking="" />}
      foot={
        <button type="button" data-flow-leave="" onClick={leave}>
          Skip for now
        </button>
      }
    >
      {children ?? <div data-list="" />}
    </FirstIssueStep>
  );
}

const draw = (node: ReactNode) => act(async () => root.render(node));
const markOf = () => container.querySelector<HTMLElement>('[data-mark]')?.dataset.mark;
const skip = () => act(async () => container.querySelector<HTMLButtonElement>('[data-flow-leave]')?.click());

/** A call to set the sign that answers when told to. */
function answerLater() {
  let answer: (value: unknown) => void = () => undefined;
  mark.markContributeOnboarded.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        answer = resolve;
      }),
  );
  return (value: unknown) => act(async () => answer(value));
}

describe('the Contribute sign, set from the page', () => {
  it('is asked once the page is drawn, and not at all for a person who has it', async () => {
    mark.markContributeOnboarded.mockResolvedValue({ ok: true, data: true });
    await draw(step());
    expect(mark.markContributeOnboarded).toHaveBeenCalledTimes(1);
    expect(markOf()).toBe('done');

    mark.markContributeOnboarded.mockClear();
    act(() => root.unmount());
    root = createRoot(container);
    await draw(step({ needsMark: false }));
    expect(mark.markContributeOnboarded).not.toHaveBeenCalled();
    await skip();
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('holds every way out until it answers, then goes on with the press', async () => {
    const answer = answerLater();
    await draw(step());
    expect(markOf()).toBe('pending');
    await skip();
    expect(leave).not.toHaveBeenCalled();
    await answer({ ok: true, data: true });
    expect(leave).toHaveBeenCalledTimes(1);
    expect(mark.markContributeOnboarded).toHaveBeenCalledTimes(1);
  });

  it('a failed call is tried again on the next press; failed twice, the press does nothing and one line says so', async () => {
    mark.markContributeOnboarded.mockResolvedValueOnce({ ok: false, error: 'UNAVAILABLE' });
    await draw(step());
    expect(markOf()).toBe('failed');
    expect(container.textContent).not.toContain(MARK_FAILED_LINE);

    mark.markContributeOnboarded.mockRejectedValueOnce(new Error('network'));
    await skip();
    expect(mark.markContributeOnboarded).toHaveBeenCalledTimes(2);
    expect(leave).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(MARK_FAILED_LINE);

    mark.markContributeOnboarded.mockResolvedValueOnce({ ok: true, data: true });
    await skip();
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('one failure with a press waiting on it counts once: no line yet, and the next press tries again and goes on', async () => {
    const answer = answerLater();
    await draw(step());
    await skip();
    await answer({ ok: false, error: 'UNAVAILABLE' });
    expect(markOf()).toBe('failed');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(leave).not.toHaveBeenCalled();

    mark.markContributeOnboarded.mockResolvedValueOnce({ ok: true, data: true });
    await skip();
    expect(mark.markContributeOnboarded).toHaveBeenCalledTimes(2);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('answered false: the first step’s "nothing connected" case in place, never this step again by itself', async () => {
    mark.markContributeOnboarded.mockResolvedValue({ ok: true, data: false });
    await draw(step());
    expect(container.querySelector('[data-who-does-the-work]')).not.toBeNull();
    expect(container.querySelector('[data-list]')).toBeNull();
    expect(container.querySelector('[aria-current="step"]')?.textContent).toContain('Your agent');
    expect(container.textContent).not.toContain('Continue');
    expect(mark.markContributeOnboarded).toHaveBeenCalledTimes(1);
  });
});

describe('the Start controls wait for the sign too', () => {
  const REF = { repo: 'acme/widgets', issue: 42 };
  const onHosted = vi.fn();

  it('a plain hosted Start is held, then sent once the sign is set', async () => {
    const answer = answerLater();
    await draw(
      step({
        children: (
          <StartControl
            control={startControlOf('contribute', REF, { hosted: true, own: false })}
            onHosted={onHosted}
            label="acme/widgets #42"
          />
        ),
      }),
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[data-start-control="hosted"]')?.click());
    expect(onHosted).not.toHaveBeenCalled();
    await answer({ ok: true, data: true });
    expect(onHosted).toHaveBeenCalledTimes(1);
  });

  it('the menu’s two ways, drawn outside the step in a portal, are held as well', async () => {
    const answer = answerLater();
    await draw(
      step({
        children: (
          <StartControl
            control={startControlOf('contribute', REF, { hosted: true, own: true })}
            onHosted={onHosted}
            label="acme/widgets #42"
          />
        ),
      }),
    );
    const trigger = container.querySelector<HTMLButtonElement>('[data-start-control="menu"]');
    await act(async () => {
      trigger?.focus();
      trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    const hosted = document.querySelector<HTMLElement>('[data-start-control="menu-hosted"]');
    const own = document.querySelector<HTMLAnchorElement>('[data-start-control="menu-own"]');
    expect(hosted).not.toBeNull();
    expect(container.contains(hosted)).toBe(false);
    expect(own?.getAttribute('href')).toBe('/my/start/acme/widgets/42');

    let followed = false;
    const watch = (event: Event) => {
      if (event.target === own) followed = !event.defaultPrevented;
    };
    document.addEventListener('click', watch);
    await act(async () => own?.click());
    document.removeEventListener('click', watch);
    expect(followed).toBe(false);

    await act(async () => hosted?.click());
    expect(onHosted).not.toHaveBeenCalled();
    await answer({ ok: true, data: true });
    expect(onHosted).toHaveBeenCalledTimes(1);
  });
});

describe('the list picked again after a save of the languages', () => {
  const save = () => act(async () => container.querySelector<HTMLButtonElement>('[data-save]')?.click());
  const tick = (ms: number) => act(async () => vi.advanceTimersByTimeAsync(ms));

  it('says it is picking at once, and reads the list again once its server time is later than before the save', async () => {
    vi.useFakeTimers();
    await draw(step({ needsMark: false }));
    expect(container.textContent).toContain('Picked for Go, from your GitHub profile.');

    actions.readFeedComputedAt.mockResolvedValueOnce({ ok: true, data: '2026-11-25T09:00:00.000Z' });
    await save();
    expect(container.querySelector('[data-picking]')).not.toBeNull();
    expect(container.querySelector('[data-list]')).toBeNull();
    expect(container.textContent).toContain('Picked for Rust.');

    actions.readFeedComputedAt.mockResolvedValueOnce({ ok: true, data: '2026-11-25T09:00:00.000Z' });
    await tick(REPICK_POLL_MS);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(container.querySelector('[data-picking]')).not.toBeNull();

    actions.readFeedComputedAt.mockResolvedValueOnce({ ok: true, data: '2026-11-25T09:01:00.000Z' });
    await tick(REPICK_POLL_MS);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-list]')).not.toBeNull();

    await tick(REPICK_POLL_MS * 3);
    expect(actions.readFeedComputedAt).toHaveBeenCalledTimes(3);
  });

  it('a time that could not be read before the save is not "no time yet": only the two minutes end the wait', async () => {
    vi.useFakeTimers();
    await draw(step({ needsMark: false }));
    actions.readFeedComputedAt.mockResolvedValueOnce({ ok: false, error: 'UNAVAILABLE' });
    await save();
    actions.readFeedComputedAt.mockResolvedValue({ ok: true, data: '2026-11-25T09:00:00.000Z' });
    await tick(REPICK_POLL_MS * 3);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(container.querySelector('[data-picking]')).not.toBeNull();
    await tick(REPICK_GIVE_UP_MS);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-list]')).not.toBeNull();
  });

  it('the box it shows meanwhile reads nothing itself: the step’s own poll reads the list once, in place', async () => {
    vi.useFakeTimers();
    actions.readFeedComputedAt.mockResolvedValue({ ok: true, data: '2026-11-25T09:00:00.000Z' });
    await draw(
      <FirstIssueStep
        mark={false}
        head={{ title: 'Pick your first issue', text: 'Claude Code is connected.' }}
        languages={{ saved: null, profile: ['GO'], preferences: null }}
        nothingConnected={NOTHING_CONNECTED}
        picking={<StillRanking reads={false} />}
        foot={null}
      >
        <div data-list="" />
      </FirstIssueStep>,
    );
    await save();
    expect(container.querySelector('[data-ranking="waiting"]')).not.toBeNull();
    await tick(30_000);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('past two minutes stops and draws the list as it stands', async () => {
    vi.useFakeTimers();
    actions.readFeedComputedAt.mockResolvedValue({ ok: true, data: '2026-11-25T09:00:00.000Z' });
    await draw(step({ needsMark: false }));
    await save();
    await tick(REPICK_GIVE_UP_MS - REPICK_POLL_MS);
    expect(router.refresh).not.toHaveBeenCalled();
    await tick(REPICK_POLL_MS);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-list]')).not.toBeNull();
  });
});

describe('the first picks being made', () => {
  it('the box reads the page again by itself here, where no live poll runs', async () => {
    vi.useFakeTimers();
    await draw(step({ needsMark: false, children: <StillRanking /> }));
    expect(container.querySelector('[data-ranking="waiting"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });
});
