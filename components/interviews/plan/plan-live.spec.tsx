// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));

const { PlanLive, planStartAddressOf } = await import('./plan-live');
const { planMineOf } = await import('./plan-send');
const { IDENTITY_PROVIDER } = await import('@/lib/auth-providers');
const { northwindSeniorPlan } = await import('@/lib/interviews/__fixtures__/plans');
const { seniorInProgress, seniorNotStarted, seniorStopped } = await import('@/lib/interviews/__fixtures__/mine');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PLAN_PATH = '/interviews/northwind/senior-software-engineer';
const MINE_PATH = '/api/me/interviews/plans/northwind/senior-software-engineer';
let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

/** The person's read answers `mine`; a start and a stop answer `start` and `stop` (a status, or the plan). */
function answer({ mine, start, stop }: { mine?: unknown; start?: unknown; stop?: unknown }) {
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url);
    const write = path.endsWith('/start') ? start : path.endsWith('/stop') ? stop : undefined;
    if (path.endsWith('/start') || path.endsWith('/stop')) {
      if (typeof write === 'number') return new Response(JSON.stringify({ ok: false }), { status: write });
      return new Response(JSON.stringify({ ok: true, data: write }), { status: 200 });
    }
    return new Response(JSON.stringify({ mine: mine ?? null }), { status: 200 });
  });
}

const box = () => host.querySelector('[data-plan-box]');
const boxKind = () => box()?.getAttribute('data-plan-box');
const buttonNamed = (name: string, within: ParentNode = host) =>
  [...within.querySelectorAll('button')].find((button) => button.textContent?.trim() === name) ?? null;
const press = (name: string, within?: ParentNode) => act(async () => buttonNamed(name, within)?.click());
const writes = () =>
  fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
    .map(([url, init]) => [String(url), JSON.parse(String((init as RequestInit).body))]);

async function draw() {
  await act(async () => root.render(<PlanLive plan={northwindSeniorPlan} zone="UTC" />));
  await act(async () => {});
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  hint.present = true;
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  signIn.mockClear();
  window.history.replaceState(null, '', PLAN_PATH);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("the plan's page in the browser", () => {
  it('asks nothing for a visitor, whose sign-in comes back to the plan to start it', async () => {
    hint.present = false;
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(boxKind()).toBe('visitor');
    await press('Sign in with GitHub to start');
    expect(signIn).toHaveBeenCalledWith(IDENTITY_PROVIDER, { redirectTo: `${PLAN_PATH}?start=1` });
    expect(planStartAddressOf('northwind', 'senior-software-engineer')).toBe(`${PLAN_PATH}?start=1`);
  });

  it("reads the person's plan and fills the box and the rounds in place", async () => {
    answer({ mine: seniorInProgress });
    await draw();
    expect(String(fetchMock.mock.calls[0][0])).toBe(MINE_PATH);
    expect(boxKind()).toBe('progress');
    expect(host.querySelector('[data-plan-held]')).toBeNull();
    expect(host.querySelector('[data-round-size="open"]')).not.toBeNull();
  });

  it('offers to start when the read fails, rather than leaving a hole', async () => {
    fetchMock.mockResolvedValue(new Response('down', { status: 502 }));
    await draw();
    expect(boxKind()).toBe('start');
  });

  it('starts the plan once back from signing in, and drops the query from the address', async () => {
    window.history.replaceState(null, '', `${PLAN_PATH}?start=1`);
    answer({ mine: seniorNotStarted, start: seniorInProgress });
    await draw();
    expect(writes()).toEqual([
      ['/api/me/interviews/start', { company: 'northwind', plan: 'senior-software-engineer' }],
    ]);
    expect(boxKind()).toBe('progress');
    expect(`${window.location.pathname}${window.location.search}`).toBe(PLAN_PATH);
  });

  it('does not start a plan already in progress on the way back, and still drops the query', async () => {
    window.history.replaceState(null, '', `${PLAN_PATH}?start=1`);
    answer({ mine: seniorInProgress });
    await draw();
    expect(writes()).toEqual([]);
    expect(window.location.search).toBe('');
  });

  it('starts the plan from the box, and starts a stopped one again', async () => {
    answer({ mine: seniorStopped, start: seniorInProgress });
    await draw();
    expect(boxKind()).toBe('start');
    await press('Start this plan');
    expect(boxKind()).toBe('progress');
  });

  it('stops the plan in place with the reason picked, then starts it again', async () => {
    const stopped = { ...seniorStopped, rounds: seniorInProgress.rounds };
    answer({ mine: seniorInProgress, stop: stopped, start: seniorInProgress });
    await draw();
    await press('Stop this plan');
    const reason = box()?.querySelector('[data-stop-reason="only_looking"] input') as HTMLInputElement;
    await act(async () => reason.click());
    await press('Stop this plan', box() ?? undefined);
    expect(writes()).toEqual([
      ['/api/me/interviews/stop', { company: 'northwind', plan: 'senior-software-engineer', reason: 'only_looking' }],
    ]);
    expect(boxKind()).toBe('stopped');
    expect(box()?.textContent).toContain('The 18 lessons you learned in it stay learned.');
    expect(host.querySelector('[data-round-size="open"]')).toBeNull();
    await press('Start this plan again');
    expect(writes()[1][0]).toBe('/api/me/interviews/start');
    expect(boxKind()).toBe('progress');
  });

  it('keeps the question with a line when the stop fails, and shows a visitor box when the session is gone', async () => {
    answer({ mine: seniorInProgress, stop: 502 });
    await draw();
    await press('Stop this plan');
    await press('Stop this plan', box() ?? undefined);
    expect(boxKind()).toBe('asking');
    expect(box()?.querySelector('[role="alert"]')).not.toBeNull();

    answer({ mine: seniorInProgress, stop: 401 });
    await press('Stop this plan', box() ?? undefined);
    expect(boxKind()).toBe('visitor');
  });
});

describe("the person's read of a plan", () => {
  it('takes only a whole read, filling what an older API leaves out', () => {
    expect(planMineOf(null)).toBeNull();
    expect(planMineOf({ state: 'in_progress' })).toBeNull();
    expect(planMineOf({ state: 'paused', rounds: [] })).toBeNull();
    expect(planMineOf({ state: 'none', rounds: [{ number: 1 }] })).toBeNull();
    expect(planMineOf({ state: 'none', rounds: [] })).toEqual({
      state: 'none',
      rounds: [],
      here: null,
      learnedBefore: 0,
      justDone: null,
      reviewDue: false,
      next: null,
    });
    expect(planMineOf(seniorInProgress)).toEqual(seniorInProgress);
  });
});
