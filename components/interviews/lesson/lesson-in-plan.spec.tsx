// @vitest-environment jsdom
import { act, use } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LessonSettingState } from '@/components/workspace/player/lesson-setting';

const { hint } = vi.hoisted(() => ({ hint: { present: true } }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { LessonInPlanProvider, planOfAddress } = await import('./lesson-in-plan');
const { LessonSettingContext } = await import('@/components/workspace/player/lesson-setting');
const { graphsInPlan, graphsTitles } = await import('@/lib/interviews/__fixtures__/lesson-in-plan');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LESSON = { slug: 'graphs-4', course: 'algorithms', group: 'graphs' };
const PLAN = 'northwind/senior-software-engineer';

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
/** What the lesson's page reads of its setting, on each draw. */
let seen: (LessonSettingState | null)[] = [];

function Reader() {
  seen.push(use(LessonSettingContext));
  return <p data-lesson="">the lesson</p>;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  hint.present = true;
  seen = [];
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

async function draw(search: string) {
  window.history.replaceState(null, '', `/learn/lessons/graphs-4${search}`);
  await act(async () => {
    root.render(
      <LessonInPlanProvider lesson={LESSON} titles={graphsTitles}>
        <Reader />
      </LessonInPlanProvider>,
    );
  });
}

const answers = (lesson: unknown) =>
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ lesson }), { status: 200 }));

describe("the plan a lesson's address names", () => {
  it('is two slugs after ?plan=, and nothing else', () => {
    expect(planOfAddress(`?plan=${PLAN}`)).toEqual({ company: 'northwind', plan: 'senior-software-engineer' });
    expect(planOfAddress('?plan=northwind')).toBeNull();
    expect(planOfAddress('')).toBeNull();
  });
});

describe('a lesson opened from a plan', () => {
  it('draws the lesson as it is and asks nothing without ?plan=', async () => {
    await draw('');
    expect(host.textContent).toBe('the lesson');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(seen.at(-1)).toBeNull();
  });

  it('asks nothing of a visitor', async () => {
    hint.present = false;
    await draw(`?plan=${PLAN}`);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(seen.at(-1)).toBeNull();
  });

  it("asks where the lesson is in the person's plan, and gives the lesson its setting", async () => {
    answers(graphsInPlan);
    await draw(`?plan=${PLAN}`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const path = String(fetchMock.mock.calls[0][0]);
    expect(path.startsWith('/api/me/interviews/lesson?')).toBe(true);
    expect(Object.fromEntries(new URLSearchParams(path.split('?')[1]))).toEqual({
      company: 'northwind',
      plan: 'senior-software-engineer',
      lesson: 'graphs-4',
      course: 'algorithms',
      group: 'graphs',
    });
    const state = seen.at(-1)!;
    expect(state.setting?.plan).toBe(PLAN);
    expect(state.setting?.next.href).toBe(`/learn/lessons/graphs-5?plan=${PLAN}`);
    expect(await state.settled()).toBe(state.setting);
    expect(host.textContent).toBe('the lesson');
  });

  it('has no setting while it reads, and none when the plan does not hold the lesson or the read fails', async () => {
    answers(null);
    await draw(`?plan=${PLAN}`);
    // The first draw had the read going, with no setting yet.
    expect(seen.some((state) => state !== null && state.setting === null)).toBe(true);
    expect(seen.at(-1)?.setting).toBeNull();
    expect(await seen.at(-1)!.settled()).toBeNull();

    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error('down'));
    seen = [];
    act(() => root.unmount());
    root = createRoot(host);
    await draw(`?plan=${PLAN}`);
    expect(seen.at(-1)?.setting).toBeNull();
    expect(await seen.at(-1)!.settled()).toBeNull();
  });
});
