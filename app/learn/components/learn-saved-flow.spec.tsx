// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const actions = vi.hoisted(() => ({
  saveLearnProfile: vi.fn(),
  readMyLearnAttempts: vi.fn(),
  readPracticeNext: vi.fn(),
}));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
vi.mock('@/lib/learn/actions', () => actions);

const { LearnProfileForm } = await import('@/components/learn/learn-profile-form');
const { PracticeNextCard } = await import('@/components/learn/practice-next');
const { filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { practiceNext } = await import('@/lib/learn/__fixtures__/home');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// The form's radios and checkboxes measure themselves; jsdom has no ResizeObserver.
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
  vi.clearAllMocks();
});

const submit = async () => {
  await act(async () => {
    container.querySelector('form')?.requestSubmit();
  });
};

describe('Goal and level, saved', () => {
  it('says Saved and goes back to Settings', async () => {
    actions.saveLearnProfile.mockResolvedValue({ ok: true, data: filledProfile });
    await act(async () => root.render(<LearnProfileForm profile={filledProfile} />));
    expect(container.textContent).toContain('Saving takes you back to Settings.');
    await submit();
    expect(actions.saveLearnProfile).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Saved');
    expect(router.push).toHaveBeenCalledWith('/my/settings');
  });

  it('stays, with why, when the save is refused', async () => {
    actions.saveLearnProfile.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    await act(async () => root.render(<LearnProfileForm profile={filledProfile} />));
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("a passed practice lesson's next step", () => {
  it('is read once when the card shows', async () => {
    actions.readPracticeNext.mockResolvedValue({ ok: true, data: practiceNext.own });
    await act(async () => root.render(<PracticeNextCard />));
    expect(actions.readPracticeNext).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-side="learn"]')).toHaveLength(2);
  });

  it('shows its links alone when that read fails', async () => {
    actions.readPracticeNext.mockResolvedValue({ ok: false, error: 'FAILED' });
    await act(async () => root.render(<PracticeNextCard />));
    expect(container.querySelector('[data-next-step="own"]')).not.toBeNull();
    expect(container.querySelector('[data-side="learn"]')).toBeNull();
    expect(container.querySelector('a[href="/learn/earlier#issues"]')).not.toBeNull();
  });

  it('reads nothing when given what to show', async () => {
    await act(async () => root.render(<PracticeNextCard next={practiceNext.back} />));
    expect(actions.readPracticeNext).not.toHaveBeenCalled();
    expect(container.querySelector('[data-next-step="back"]')).not.toBeNull();
  });
});
