// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
const actions = vi.hoisted(() => ({
  saveLearnProfile: vi.fn(),
  readMyLearnAttempts: vi.fn(),
  readLearnIssueCount: vi.fn(),
  readPracticeNext: vi.fn(),
}));
vi.mock('@/lib/learn/actions', () => actions);
vi.mock('@/lib/learn/actions', () => actions);

const { LearnProfileForm } = await import('./learn-profile-form');
const { PracticeNextCard } = await import('@/components/learn/practice-next');
const { filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { learnIssues, myLearnAttempts, practiceNext } = await import('@/lib/learn/__fixtures__/home');

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
  it('says Saved and shows how many issues fit the goal, read with no row revealed', async () => {
    actions.saveLearnProfile.mockResolvedValue({ ok: true, data: filledProfile });
    actions.readMyLearnAttempts.mockResolvedValue({ ok: true, data: myLearnAttempts.none });
    actions.readLearnIssueCount.mockResolvedValue({ ok: true, data: learnIssues({ items: [], total: 4 }) });
    await act(async () => root.render(<LearnProfileForm profile={filledProfile} />));
    expect(container.querySelector('[data-saved-next]')).toBeNull();
    await submit();
    expect(actions.saveLearnProfile).toHaveBeenCalledTimes(1);
    expect(actions.readLearnIssueCount).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Saved');
    expect(container.querySelector('[data-saved-next]')?.textContent).toContain('4 open issues fit TypeScript.');
    // The panel's button is the one primary action now.
    expect(container.querySelector('button[type="submit"]')?.getAttribute('data-variant')).toBe('outline');
  });

  it('leads back to the lesson in progress, never one that is not', async () => {
    actions.saveLearnProfile.mockResolvedValue({ ok: true, data: filledProfile });
    actions.readMyLearnAttempts.mockResolvedValue({ ok: true, data: myLearnAttempts.working });
    actions.readLearnIssueCount.mockResolvedValue({ ok: true, data: learnIssues({ items: [], total: 4 }) });
    await act(async () => root.render(<LearnProfileForm profile={filledProfile} />));
    await submit();
    expect(container.querySelector('[data-saved-next]')?.getAttribute('data-saved-next')).toBe('lesson');
    expect(container.querySelector('a[href="/learn/attempts/A_1"]')).not.toBeNull();
  });

  it('falls back to Learn home when neither read answers, and hides the panel on the next edit', async () => {
    actions.saveLearnProfile.mockResolvedValue({ ok: true, data: filledProfile });
    actions.readMyLearnAttempts.mockRejectedValue(new Error('down'));
    actions.readLearnIssueCount.mockResolvedValue({ ok: false, error: 'FAILED' });
    await act(async () => root.render(<LearnProfileForm profile={filledProfile} />));
    await submit();
    expect(container.querySelector('[data-saved-next]')?.textContent).toContain(
      'Learn home lists the open issues for your goal.',
    );
    const focus = container.querySelector<HTMLButtonElement>('button[role="checkbox"]');
    await act(async () => {
      focus?.click();
    });
    expect(container.querySelector('[data-saved-next]')).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });
});

describe("a passed practice lesson's next step", () => {
  it('is read once when the card shows', async () => {
    actions.readPracticeNext.mockResolvedValue({ ok: true, data: practiceNext.own });
    await act(async () => root.render(<PracticeNextCard />));
    expect(actions.readPracticeNext).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-learn-issue]')).toHaveLength(2);
  });

  it('shows its links alone when that read fails', async () => {
    actions.readPracticeNext.mockResolvedValue({ ok: false, error: 'FAILED' });
    await act(async () => root.render(<PracticeNextCard />));
    expect(container.querySelector('[data-next-step="own"]')).not.toBeNull();
    expect(container.querySelector('[data-learn-issue]')).toBeNull();
    expect(container.querySelector('a[href="/learn#issues"]')).not.toBeNull();
  });

  it('reads nothing when given what to show', async () => {
    await act(async () => root.render(<PracticeNextCard next={practiceNext.back} />));
    expect(actions.readPracticeNext).not.toHaveBeenCalled();
    expect(container.querySelector('[data-next-step="back"]')).not.toBeNull();
  });
});
