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
const { push, replace, router } = vi.hoisted(() => {
  const calls = { push: vi.fn(), replace: vi.fn() };
  return { ...calls, router: calls };
});
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { NextView } = await import('./next-view');
const { NextLive, afterOfAddress } = await import('./next-live');
const { nextScreenOf } = await import('@/lib/interviews/next');
const { northwindSeniorPlan } = await import('@/lib/interviews/__fixtures__/plans');
const { nextAfterPart, nextAfterPlan, nextAfterRound, seniorStopped } = await import(
  '@/lib/interviews/__fixtures__/mine'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PLAN_PATH = '/interviews/northwind/senior-software-engineer';
const NEXT_PATH = `${PLAN_PATH}/next?after=algorithms%2Fgraphs`;
let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

const partScreen = nextScreenOf(northwindSeniorPlan, nextAfterPart, 'algorithms/graphs');
const roundScreen = nextScreenOf(northwindSeniorPlan, nextAfterRound, 'interview-skills/thinking-aloud');
const planScreen = nextScreenOf(northwindSeniorPlan, nextAfterPlan, 'interviewing-at-northwind/northwind-values');

const $ = (selector: string, within: ParentNode = host) => within.querySelector<HTMLElement>(selector);
/** The words of a node as a person reads them: each piece of text apart. */
function wordsOf(node: Node | null): string | null {
  if (!node) return null;
  const parts: string[] = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let at = walker.nextNode(); at; at = walker.nextNode()) {
    const piece = at.textContent?.trim();
    if (piece) parts.push(piece);
  }
  return parts.join(' ').replace(/\s+/g, ' ');
}
const text = (selector: string) => wordsOf($(selector));
const links = (within: ParentNode = host) =>
  [...within.querySelectorAll('a')].map((link) => [wordsOf(link), link.getAttribute('href')]);
const press = (key: string, on: EventTarget = document.body) =>
  act(() => {
    on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });

async function draw(node: ReactNode) {
  await act(async () => root.render(node));
  await act(async () => {});
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  hint.present = true;
  push.mockReset();
  replace.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  window.history.replaceState(null, '', NEXT_PATH);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('the connecting screen after a part', () => {
  it('reads in order: the strip, what was done, the rounds, the next thing, the way back', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={partScreen} />);
    expect(text('[data-next-strip] nav:not(.sm\\:hidden)')).toBe(
      'Interviews / Northwind · Senior software engineer / Round 3 · Coding interviews',
    );
    expect(text('[data-next-parts]')).toBe('1 of 3 parts done');
    expect(host.querySelectorAll('[data-part-square="done"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part-square="open"]')).toHaveLength(2);
    const main = $('main')!;
    expect(main.getAttribute('data-next-screen')).toBe('part');
    expect(text('main h1')).toBe('Graphs');
    expect(text('main h1 + p')).toBe('11 lessons learned. You are in round 3 of 5, Coding interviews.');
    expect(text('[data-next-thing="lessons"]')).toBe(
      'Next Dynamic programming 12 lessons from Algorithms and data structures Start Dynamic programming ⏎ It opens the first lesson at once.',
    );
    expect(links($('[data-next-thing]')!)).toEqual([
      ['Start Dynamic programming ⏎', '/learn/lessons/overlapping-subproblems?plan=northwind/senior-software-engineer'],
    ]);
    const order = [...main.querySelectorAll('h1, [data-rounds-glance], [data-next-thing]')].map((node) =>
      node.tagName === 'H1' ? 'head' : node.hasAttribute('data-rounds-glance') ? 'rounds' : 'next',
    );
    expect(order).toEqual(['head', 'rounds', 'next']);
    expect(links(main).at(-1)).toEqual(['Back to the plan', PLAN_PATH]);
  });

  it('says on a phone where the person is in one caption, and the strip in short', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={partScreen} />);
    expect(text('[data-next-strip] nav.sm\\:hidden')).toBe('Northwind interview / Round 3 · Coding interviews');
    expect($('main h1 + p span')!.className).toContain('max-sm:hidden');
    expect(text('[data-rounds-glance] .sm\\:hidden')).toContain('Round 3 of 5 · Coding interviews');
  });

  it('draws the five rounds on the wide line: two ticks, the ring of the round the person is in, the rest', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={partScreen} />);
    const wide = [...host.querySelectorAll('[data-round-glance]')];
    expect(wide.map(wordsOf)).toEqual([
      'Round 1 , done Recruiter call',
      'Round 2 , done Online assessment',
      '3 Coding interviews',
      '4 System design',
      '5 Values interview',
    ]);
    expect(wide.map((point) => $('[data-round-point]', point)?.getAttribute('data-round-point'))).toEqual([
      'done',
      'done',
      'here',
      'plain',
      'plain',
    ]);
  });

  it("opens a round's panel over the page from its point, each part ready to start", async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={partScreen} />);
    const fourth = host.querySelector<HTMLElement>('[data-round-glance="4"]')!;
    await act(async () => fourth.click());
    const panel = document.querySelector<HTMLElement>('[data-round-panel="4"]')!;
    expect(wordsOf(panel)).toBe(
      'System design 16 lessons Scaling a service 8 lessons Storing data 8 lessons Open this round in the plan',
    );
    expect(links(panel)).toEqual([
      ['Scaling a service 8 lessons', '/learn/lessons/one-server-to-many?plan=northwind/senior-software-engineer'],
      ['Storing data 8 lessons', '/learn/lessons/picking-a-database?plan=northwind/senior-software-engineer'],
      ['Open this round in the plan', `${PLAN_PATH}#round-4`],
    ]);
  });

  it('lists the rounds from the bottom on a phone, each with where the person stands, each a way to its round', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={partScreen} />);
    const all = [...host.querySelectorAll('button')].find((button) => button.textContent === 'All rounds')!;
    await act(async () => all.click());
    const sheet = document.querySelector<HTMLElement>('section[aria-label="The rounds"]')!;
    expect(links(sheet)).toEqual([
      ['Round 1 , done Recruiter call 6 learned', `${PLAN_PATH}#round-1`],
      ['Round 2 , done Online assessment 9 learned', `${PLAN_PATH}#round-2`],
      ['3 Coding interviews you are here', `${PLAN_PATH}#round-3`],
      ['4 System design 16 lessons', `${PLAN_PATH}#round-4`],
      ['5 Values interview 6 lessons', `${PLAN_PATH}#round-5`],
    ]);
  });

  it('opens the main action on Enter, unless a control has the key', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={partScreen} />);
    press('Enter');
    expect(push).toHaveBeenCalledWith('/learn/lessons/overlapping-subproblems?plan=northwind/senior-software-engineer');
    push.mockReset();
    press('Enter', $('[data-round-glance="1"]')!);
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps its column empty while the person is read', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={null} />);
    expect($('main')!.getAttribute('data-next-screen')).toBe('reading');
    expect($('main h1')).toBeNull();
    expect(text('[data-next-strip] nav:not(.sm\\:hidden)')).toBe('Interviews / Northwind · Senior software engineer');
    press('Enter');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('the connecting screen after a round', () => {
  it('says the round is done and offers the next round with its facts', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={roundScreen} />);
    expect(text('main h1')).toBe('Round 3: Coding interviews');
    expect(text('main h1 + p')).toBe('28 lessons learned in this round.');
    expect(text('[data-next-thing="round"]')).toBe(
      'Next Round 4: System design 1 round, 60 minutes. It starts with Scaling a service, 8 lessons. Start round 4 ⏎',
    );
    expect(text('[data-next-parts]')).toBe('3 of 3 parts done');
  });
});

describe('the connecting screen after the plan', () => {
  it('says the plan is done, offers two ways on, and promises nothing', async () => {
    await draw(<NextView plan={northwindSeniorPlan} screen={planScreen} />);
    expect(text('main h1')).toBe('Your Northwind interview plan');
    expect(text('main h1 + p')).toBe(`5 rounds: ${northwindSeniorPlan.lessons} lessons learned, since 2 Nov.`);
    expect(links($('[data-next-thing="finished"]')!)).toEqual([
      ['Fix a real issue ⏎', '/contribute'],
      ['See other plans', '/interviews/northwind'],
    ]);
    expect(text('[data-next-thing="finished"] p')).toBe(
      'A finished plan is preparation, not a promise. Your interview plans are not publicly visible.',
    );
    expect(host.querySelectorAll('[data-round-glance] [data-round-point="done"]')).toHaveLength(5);
  });
});

describe('the copy of every case', () => {
  // The words themselves are read for the long dash and the word Interviews never uses by the copy spec.
  it('has no long dash, and never draws a zero count', async () => {
    const dashes = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
    for (const screen of [partScreen, roundScreen, planScreen]) {
      await draw(<NextView plan={northwindSeniorPlan} screen={screen} />);
      const words = host.textContent ?? '';
      expect(words).not.toMatch(dashes);
      expect(words).not.toMatch(/(^|\D)0 (lesson|part|round|learned)/);
    }
  });
});

describe('the connecting screen in the browser', () => {
  const answerWith = (next: unknown) =>
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ next }), { status: 200 }));

  it("reads the part the address names, and draws the person's screen", async () => {
    answerWith(nextAfterPart);
    await draw(<NextLive plan={northwindSeniorPlan} />);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      '/api/me/interviews/next/northwind/senior-software-engineer?after=algorithms%2Fgraphs',
    );
    expect(text('main h1')).toBe('Graphs');
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends anyone else to the plan: no session, no part named, a plan not in progress, a failed read', async () => {
    hint.present = false;
    await draw(<NextLive plan={northwindSeniorPlan} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replace).toHaveBeenLastCalledWith(PLAN_PATH);

    hint.present = true;
    replace.mockReset();
    window.history.replaceState(null, '', `${PLAN_PATH}/next?after=..%2Fgraphs`);
    await act(async () => root.unmount());
    root = createRoot(host);
    await draw(<NextLive plan={northwindSeniorPlan} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replace).toHaveBeenLastCalledWith(PLAN_PATH);

    for (const answer of [{ done: nextAfterPart.done, mine: seniorStopped }, null]) {
      window.history.replaceState(null, '', NEXT_PATH);
      replace.mockReset();
      answerWith(answer);
      await act(async () => root.unmount());
      root = createRoot(host);
      await draw(<NextLive plan={northwindSeniorPlan} />);
      expect(replace).toHaveBeenLastCalledWith(PLAN_PATH);
      expect($('main h1')).toBeNull();
    }
  });

  it('reads the part from the address', () => {
    expect(afterOfAddress('?after=algorithms%2Fgraphs')).toBe('algorithms/graphs');
    expect(afterOfAddress('?after=graphs')).toBeNull();
    expect(afterOfAddress('')).toBeNull();
  });
});
