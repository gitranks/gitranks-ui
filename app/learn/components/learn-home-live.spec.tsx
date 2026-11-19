// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
const actions = vi.hoisted(() => ({
  readMyLearnAttempts: vi.fn(),
  readPracticeLessons: vi.fn(),
  readAttemptStage: vi.fn(),
}));
vi.mock('@/lib/learn/actions', () => actions);

const { LearnHomeLive } = await import('./learn-home-live');
const { PracticeSection } = await import('./practice-lessons');
const { AttemptStageWatch } = await import('./attempt-stage-watch');
const { myLearnAttempts, practiceLessons, PRACTICE } = await import('@/lib/learn/__fixtures__/home');
const { OWN_LESSON_POLL_MS, ownLessonKeyOf } = await import('@/lib/learn/learn-home');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let hidden = false;

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const tick = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(OWN_LESSON_POLL_MS);
  });
};

describe("Learn home's re-read of the own lesson", () => {
  const watching = ownLessonKeyOf(myLearnAttempts.working);

  it('reads every 15 seconds and reads the page again only once the lesson moved', async () => {
    actions.readMyLearnAttempts.mockResolvedValue({ ok: true, data: myLearnAttempts.working });
    await act(async () => root.render(<LearnHomeLive watching={watching} />));
    expect(actions.readMyLearnAttempts).not.toHaveBeenCalled();
    await tick();
    expect(actions.readMyLearnAttempts).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    actions.readMyLearnAttempts.mockResolvedValue({ ok: true, data: myLearnAttempts.ready });
    await tick();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('asks nothing while the page is hidden, and at once when it is shown again', async () => {
    actions.readMyLearnAttempts.mockResolvedValue({ ok: true, data: myLearnAttempts.working });
    await act(async () => root.render(<LearnHomeLive watching={watching} />));
    hidden = true;
    await tick();
    await tick();
    expect(actions.readMyLearnAttempts).not.toHaveBeenCalled();
    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(actions.readMyLearnAttempts).toHaveBeenCalledTimes(1);
  });

  it('stops once Learn is closed to the account or it signed out, and keeps asking after a failure', async () => {
    actions.readMyLearnAttempts.mockResolvedValue({ ok: false, error: 'FAILED' });
    await act(async () => root.render(<LearnHomeLive watching={watching} />));
    await tick();
    await tick();
    expect(actions.readMyLearnAttempts).toHaveBeenCalledTimes(2);
    actions.readMyLearnAttempts.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    await tick();
    await tick();
    await tick();
    expect(actions.readMyLearnAttempts).toHaveBeenCalledTimes(3);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("a lesson page's re-read while the agent works", () => {
  it('reads the stage every 15 seconds and reads the page again once it changed', async () => {
    actions.readAttemptStage.mockResolvedValue({ ok: true, data: 'AGENT_WORKING' });
    await act(async () => root.render(<AttemptStageWatch attemptId="A_1" stage="AGENT_WORKING" />));
    await tick();
    expect(actions.readAttemptStage).toHaveBeenCalledWith('A_1');
    expect(refresh).not.toHaveBeenCalled();
    actions.readAttemptStage.mockResolvedValue({ ok: true, data: 'WARMUP' });
    await tick();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reads the page once, then stops, when the viewer has no lesson there any more', async () => {
    actions.readAttemptStage.mockResolvedValue({ ok: true, data: null });
    await act(async () => root.render(<AttemptStageWatch attemptId="A_1" stage="AGENT_WORKING" />));
    await tick();
    await tick();
    expect(actions.readAttemptStage).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops once the attempt is no longer the viewer’s to read', async () => {
    actions.readAttemptStage.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    await act(async () => root.render(<AttemptStageWatch attemptId="A_1" stage="AGENT_WORKING" />));
    await tick();
    await tick();
    expect(actions.readAttemptStage).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('Show all practice lessons', () => {
  const click = async (label: RegExp) => {
    const button = [...container.querySelectorAll('button')].find((each) => label.test(each.textContent ?? ''));
    expect(button, String(label)).toBeTruthy();
    await act(async () => {
      button?.click();
    });
  };

  it('reads up to 30 in place', async () => {
    const all = practiceLessons({ items: [...PRACTICE, { ...PRACTICE[0], slug: 'fourth-lesson' }], total: 4 });
    actions.readPracticeLessons.mockResolvedValue({ ok: true, data: all });
    await act(async () =>
      root.render(<PracticeSection practice={practiceLessons({ total: 4 })} goal="TypeScript" title="t" text="x" />),
    );
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(3);
    await click(/Show all 4/);
    expect(actions.readPracticeLessons).toHaveBeenCalledWith(30);
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(4);
    expect(container.textContent).not.toContain('Show all');
  });

  it('says so when they could not be read, and keeps the three', async () => {
    actions.readPracticeLessons.mockResolvedValue({ ok: false, error: 'FAILED' });
    await act(async () =>
      root.render(<PracticeSection practice={practiceLessons()} goal="TypeScript" title="t" text="x" />),
    );
    await click(/Show all 7/);
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(3);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Couldn’t load them.');
  });
});
