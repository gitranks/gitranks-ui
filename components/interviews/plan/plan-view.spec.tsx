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

const { PlanView } = await import('./plan-view');
const { PLAN_SEND_FAILED } = await import('./plan-box');
const { planBoxOf } = await import('@/lib/interviews/plan');
const { northwindSeniorPlan, tallgrassSrePlan } = await import('@/lib/interviews/__fixtures__/plans');
const {
  seniorFinished,
  seniorFinishedReviewDue,
  seniorInProgress,
  seniorNotStarted,
  seniorRoundDone,
  seniorStopped,
  tallgrassStarted,
} = await import('@/lib/interviews/__fixtures__/mine');
const { seniorJumped, seniorStartedToday } = await import('@/lib/interviews/__fixtures__/plan-mine');
type Mine = import('@/lib/interviews/types').InterviewPlanMine;
type Plan = import('@/lib/interviews/types').InterviewPlanPage;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date('2026-11-27T12:00:00.000Z');
let root: Root;
let host: HTMLDivElement;
const onSignIn = vi.fn(async () => true);
const onStart = vi.fn(async () => true);
const onStop = vi.fn(async (_reason: string | null) => true);

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  onSignIn.mockClear();
  onStart.mockClear();
  onStop.mockClear();
  onStop.mockImplementation(async () => true);
  signIn.mockClear();
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

/** The page for a visitor (no `mine`), or for a person with their read. */
async function draw(plan: Plan, mine: Mine | null, { session = mine !== null, stoppedNow = false } = {}) {
  await act(async () =>
    root.render(
      <PlanView
        plan={plan}
        box={planBoxOf(plan, mine, { session, stoppedNow })}
        mine={mine}
        now={NOW}
        zone="UTC"
        onSignIn={onSignIn}
        onStart={onStart}
        onStop={onStop}
      />,
    ),
  );
}

/** What a node reads: its pieces of text one after the other, apart as a screen shows them. */
function text(node: Element | null | undefined): string {
  if (!node) return '';
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let at = walker.nextNode(); at; at = walker.nextNode()) parts.push(at.textContent ?? '');
  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([,.:?])/g, '$1')
    .trim();
}
const box = () => host.querySelector('[data-plan-box]');
const boxKind = () => box()?.getAttribute('data-plan-box');
const buttonNamed = (name: string, within: ParentNode = host) =>
  [...within.querySelectorAll('button')].find((button) => text(button) === name) ?? null;
const linkNamed = (name: string) => [...host.querySelectorAll('a')].find((link) => text(link) === name) ?? null;
const press = (name: string, within?: ParentNode) => act(async () => buttonNamed(name, within)?.click());
const sizes = () =>
  [...host.querySelectorAll('[data-round-row] [data-round-size]')].map((round) =>
    round.getAttribute('data-round-size'),
  );
const points = () =>
  [...host.querySelectorAll('[data-round-row]')].map((row) => row.getAttribute('data-round-point-kind'));
const row = (number: number) => host.querySelector(`[data-round-row="${number}"]`);

/** No count of nothing, no long dash, never the word the rules forbid: every case is read whole. */
function expectCleanCopy() {
  const all = text(host);
  expect(all).not.toMatch(/(^|[^\d])0 (lesson|round|project|source|of)/);
  expect(all).not.toMatch(new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`));
  expect(all).not.toMatch(new RegExp(['cl', 'aim'].join(''), 'i'));
}

describe("a plan's page for a visitor", () => {
  it('reads in order: what it is, the box, the rounds on one line, the other plans, the foot', async () => {
    await draw(northwindSeniorPlan, null);
    const head = text(host.querySelector('h1'));
    expect(head).toBe('Northwind · Senior software engineer');
    expect(host.querySelector('h1 [data-company-logo="northwind"]')).not.toBeNull();
    expect(linkNamed('Northwind interviews')?.getAttribute('href')).toBe('/interviews/northwind');
    expect(text(host.querySelector('[data-plan-facts]'))).toBe(
      'Level N3 · 5 rounds to prepare · 65 lessons · 4 to 8 weeks from the first call to the offer',
    );
    expect(text(host.querySelector('[data-plan-notice]'))).toBe(
      'Not an official Northwind page. Built from public sources, last checked 26 Nov 2026.',
    );
    const order = [
      ...host.querySelectorAll('[data-plan-box], [data-plan-rounds], [data-plan-others], [data-plan-foot]'),
    ];
    expect(order.map((node) => node.getAttribute('data-plan-box') ?? [...node.attributes][0].name)).toEqual([
      'visitor',
      'data-plan-rounds',
      'data-plan-others',
      'data-plan-foot',
    ]);
    expectCleanCopy();
  });

  it('asks to sign in to start, and says it is free and private', async () => {
    await draw(northwindSeniorPlan, null);
    expect(text(box())).toBe(
      'Prepare for this interview 5 rounds · 65 lessons Follow the rounds in order. Lessons you learned before count at once. Sign in with GitHub to start Free. Your interview plans are not publicly visible.',
    );
    await press('Sign in with GitHub to start');
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(text(box())).not.toContain('Stop this plan');
  });

  it('draws every round closed with what it teaches, on a grey line that goes on dashed', async () => {
    await draw(northwindSeniorPlan, null);
    expect(sizes()).toEqual(['closed', 'closed', 'closed', 'closed', 'closed']);
    expect(points()).toEqual(['plain', 'plain', 'plain', 'plain', 'plain']);
    expect(text(row(3))).toContain('Coding interviews 2 or 3 rounds, 45 to 60 minutes each');
    expect(text(row(3))).toContain('Learn: Graphs, Dynamic programming, Thinking aloud');
    expect(row(5)?.querySelectorAll('[data-round-segment="dashed"]').length).toBe(1);
    expect(text(host.querySelector('[data-plan-rounds] p'))).toBe('One line, from the first call to the offer.');
  });

  it('goes on through what happens after the interviews, each stage with who states it', async () => {
    await draw(northwindSeniorPlan, null);
    const after = [...host.querySelectorAll('[data-plan-after]')].map(text);
    expect(after).toEqual([
      'Hiring committee Northwind and candidates 1 meeting. A group that did not interview you decides, and at which level.',
      'Team match Candidates report One or two calls with teams that have an opening.',
      'Offer Candidates report A call with the recruiter, then the offer in writing.',
    ]);
    expect(text(host.querySelector('[data-round-after="heading"]'))).toBe(
      'After the interviews: nothing to prepare, it is what happens next',
    );
  });

  it('opens a closed round in place, with its items and its details', async () => {
    await draw(northwindSeniorPlan, null);
    await press(text(row(3)?.querySelector('button')), row(3) ?? undefined);
    expect(row(3)?.querySelector('[data-round-size="opened"]')).not.toBeNull();
    const items = [...(row(3)?.querySelectorAll('[data-round-item]') ?? [])];
    expect(items.map(text)).toEqual([
      'Graphs · Algorithms and data structures 11 lessons',
      'Dynamic programming · Algorithms and data structures 12 lessons',
      'Thinking aloud · Interview skills 5 lessons',
    ]);
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe(
      '/learn/lessons/what-a-graph-is?plan=northwind/senior-software-engineer',
    );
    expect(text(row(3)?.querySelector('p'))).toBe(
      'Whether you turn a problem into working code and explain your choices as you go.',
    );
  });

  it('lists the other plans of the company with their levels and rounds, and the foot', async () => {
    await draw(northwindSeniorPlan, null);
    const others = [...host.querySelectorAll('[data-plan-others] li')].map(text);
    expect(others[0]).toBe('Entry level software engineer · N1 4 rounds');
    expect(others).toContain('Site reliability engineer, mid level and senior · N2 and N3 4 rounds');
    expect(others).toContain('Engineering manager 4 rounds');
    expect(text(host.querySelector('[data-plan-foot]'))).toBe(
      'Facts from 8 public sources, written in our own words · last checked 26 Nov 2026 · How we research · Markdown version',
    );
    expect(linkNamed('How we research')?.getAttribute('href')).toBe('/interviews/about');
    expect(linkNamed('Markdown version')?.getAttribute('href')).toBe(
      '/interviews/northwind/senior-software-engineer.md',
    );
  });
});

describe('"Details and sources"', () => {
  it('says where, how many, how long, the rule on AI help, who states it and the sources with dates', async () => {
    await draw(northwindSeniorPlan, seniorInProgress);
    const coding = row(3);
    await press('Details and sources', coding ?? undefined);
    const details = coding?.querySelector('[data-round-details]');
    expect([...(details?.querySelectorAll('dl > div') ?? [])].map(text)).toEqual([
      'How many 2 or 3 rounds',
      'How long 45 to 60 minutes each',
      'Where A shared editor. The code does not run.',
      'AI help Not allowed.',
    ]);
    expect(text(details)).toContain('Northwind and candidates 4 sources, read on 26 Nov 2026');
    expect(details?.querySelectorAll('[data-source]').length).toBe(3);
    expect(text(buttonNamed('1 more source', details ?? undefined))).toBe('1 more source');
    expect(details?.querySelector('[data-round-note]')).toBeNull();
    expectCleanCopy();
  });

  it('opens "This is wrong" in place and sends the round\'s key from the plan', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await draw(northwindSeniorPlan, seniorInProgress);
    const coding = row(3) ?? undefined;
    await press('Details and sources', coding);
    await press('This is wrong', coding);
    expect(text(coding?.querySelector('[data-wrong-form] label'))).toBe('What is wrong with this round?');
    const area = coding?.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(area, 'Four rounds.');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => coding?.querySelector('form')?.requestSubmit());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      company: 'northwind',
      plan: 'senior-software-engineer',
      fact: 'software-engineer/senior/rounds/3',
      note: 'Four rounds.',
    });
  });
});

describe('a smaller company', () => {
  it('says all levels, draws a round with nothing to do as facts, and ends the line at the last round', async () => {
    await draw(tallgrassSrePlan, null);
    expect(text(host.querySelector('[data-plan-facts]'))).toBe('All levels · 3 rounds to prepare · 16 lessons');
    expect(text(host.querySelector('[data-plan-notice]'))).toContain('Sources do not tell the levels apart.');
    expect(host.querySelector('h1 [data-company-letter]')).not.toBeNull();
    expect(sizes()).toEqual(['closed', 'facts', 'closed']);
    expect(text(row(2))).toBe(
      '2 Take-home project Up to 1 round Whether you fix a small broken service and explain what you changed. Nothing to prepare with us for this round yet.',
    );
    expect(row(2)?.querySelector('button')).toBeNull();
    expect(host.querySelector('[data-round-after]')).toBeNull();
    expect(row(3)?.querySelectorAll('[data-round-segment="none"]').length).toBe(1);
    expect(text(host.querySelector('[data-plan-rounds] p'))).toBe('One line, in the order the rounds happen.');
    expect(host.querySelector('[data-plan-others]')).toBeNull();
    expectCleanCopy();
  });

  it('draws the line of a thin round in its details', async () => {
    await draw(tallgrassSrePlan, null);
    const systems = row(3) ?? undefined;
    await press(text(systems?.querySelector('button')), systems);
    await press('Details and sources', systems);
    expect(text(systems?.querySelector('[data-round-note="thin"]'))).toBe(
      'Thin: this round rests on one report and one guide.',
    );
  });

  it("keeps a thin round's notes, with the thin line after them", async () => {
    const plan = {
      ...tallgrassSrePlan,
      rounds: tallgrassSrePlan.rounds.map((round) =>
        round.number === 3 ? { ...round, notes: 'Sources do not agree on how long it takes.' } : round,
      ),
    };
    await draw(plan, null);
    const systems = row(3) ?? undefined;
    await press(text(systems?.querySelector('button')), systems);
    await press('Details and sources', systems);
    expect([...(systems?.querySelectorAll('[data-round-note]') ?? [])].map((note) => text(note))).toEqual([
      'Sources do not agree on how long it takes.',
      'Thin: this round rests on one report and one guide.',
    ]);
  });
});

describe('the box, in each state', () => {
  it('offers to start a plan not started, with the lessons learned before', async () => {
    await draw(northwindSeniorPlan, seniorNotStarted);
    expect(boxKind()).toBe('start');
    expect(text(box())).toBe(
      'Prepare for this interview 5 rounds · 65 lessons Follow the rounds in order. You already learned 21 of these lessons. Start this plan Free. Your interview plans are not publicly visible.',
    );
    await press('Start this plan');
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('says a failed start under the button, in place', async () => {
    onStart.mockImplementationOnce(async () => false);
    await draw(northwindSeniorPlan, seniorNotStarted);
    await press('Start this plan');
    expect(text(box()?.querySelector('[role="alert"]'))).toBe(PLAN_SEND_FAILED.start);
  });

  it('goes on with a group of lessons', async () => {
    await draw(northwindSeniorPlan, seniorInProgress);
    expect(boxKind()).toBe('progress');
    expect(text(box())).toBe(
      'You are on round 3 of 5 started 20 Nov Next: Algorithms and data structures · Graphs Continue with Graphs 18 of 65 lessons learned. Your interview plans are not publicly visible. · Stop this plan',
    );
    expect(linkNamed('Continue with Graphs')?.getAttribute('href')).toBe(
      '/learn/lessons/graphs-4?plan=northwind/senior-software-engineer',
    );
    expect([...host.querySelectorAll('[data-plan-mark]')].map((mark) => mark.getAttribute('data-plan-mark'))).toEqual([
      'done',
      'done',
      'here',
      'ahead',
      'ahead',
    ]);
  });

  it('draws the rounds in their three sizes, "You are here" on the round and its next item', async () => {
    await draw(northwindSeniorPlan, seniorInProgress);
    expect(sizes()).toEqual(['row', 'row', 'open', 'closed', 'closed']);
    expect(points()).toEqual(['done', 'done', 'here', 'plain', 'plain']);
    expect(text(row(1))).toBe('Round 1, done Recruiter call 6 lessons learned');
    const items = [...(row(3)?.querySelectorAll('[data-round-item]') ?? [])];
    expect(text(items[0])).toBe('Graphs · Algorithms and data structures 3 of 11 learned You are here');
    expect(items[0].getAttribute('data-item-standing')).toBe('started');
    expect(text(row(3)?.querySelector('h3')?.parentElement)).toBe(
      'Coding interviews 2 or 3 rounds, 45 to 60 minutes each You are here',
    );
    const solid = (number: number) => row(number)?.querySelectorAll('[data-round-segment="solid"]').length;
    expect([solid(1), solid(2), solid(3), solid(4)]).toEqual([1, 2, 1, 0]);
  });

  it('opens a finished round in place to show what was done', async () => {
    await draw(northwindSeniorPlan, seniorInProgress);
    await press(text(row(2)?.querySelector('button')), row(2) ?? undefined);
    expect(text(row(2)?.querySelector('[data-round-item]'))).toBe(
      'Hash maps · Algorithms and data structures 9 lessons learned Done',
    );
  });

  it('starts with the first group on the day the plan starts', async () => {
    await draw(northwindSeniorPlan, seniorStartedToday);
    expect(text(box())).toBe(
      'You are on round 1 of 5 started today Next: Telling a clear story, 6 lessons Start with Telling a clear story You already learned 21 of the 65 lessons. Your interview plans are not publicly visible. · Stop this plan',
    );
    expect(sizes()).toEqual(['open', 'row', 'closed', 'closed', 'closed']);
  });

  it('says a round just finished and leads into the next', async () => {
    await draw(northwindSeniorPlan, seniorRoundDone);
    expect(boxKind()).toBe('round');
    expect(text(box())).toBe(
      'Round 3 done: Coding interviews 28 lessons learned Next: round 4, System design. It starts with Scaling a service, 8 lessons. Start round 4 The button opens the first lesson at once. · Stop this plan',
    );
    expect(linkNamed('Start round 4')?.getAttribute('href')).toBe(
      '/learn/lessons/one-server-to-many?plan=northwind/senior-software-engineer',
    );
  });

  it('says a finished plan with two ways on, and promises nothing', async () => {
    await draw(northwindSeniorPlan, seniorFinished);
    expect(text(box())).toBe(
      'You finished this plan 2 Nov to 26 Nov 5 rounds: 65 lessons learned. Fix a real issue See other plans A finished plan is preparation, not a promise. Your interview plans are not publicly visible.',
    );
    expect(linkNamed('Fix a real issue')?.getAttribute('href')).toBe('/contribute');
    expect(linkNamed('See other plans')?.getAttribute('href')).toBe('/interviews/northwind');
    expect(sizes()).toEqual(['row', 'row', 'row', 'row', 'row']);
    expect(points()).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(buttonNamed('Stop this plan')).toBeNull();
  });

  it('says lessons come back in review only when one of the plan is due', async () => {
    await draw(northwindSeniorPlan, seniorFinishedReviewDue);
    expect(text(box())).toContain('Lessons still come back in your review, so you remember them on the day.');
  });

  it('draws a plan stopped before as one not started, with what was learned shown as done', async () => {
    await draw(northwindSeniorPlan, seniorStopped);
    expect(boxKind()).toBe('start');
    expect(text(box())).toContain('You already learned 6 of these lessons.');
    expect(points()).toEqual(['done', 'plain', 'plain', 'plain', 'plain']);
    expect(host.querySelector('[data-round-size="open"]')).toBeNull();
  });
});

describe('nothing is locked', () => {
  it('keeps "You are here" on the first round with something left, and ticks a round passed out of order', async () => {
    await draw(northwindSeniorPlan, seniorJumped);
    expect(text(host.querySelector('[data-plan-rounds] p'))).toBe(
      'One line, from the first call to the offer. Open any round and start anything in it.',
    );
    expect(points()).toEqual(['done', 'done', 'here', 'started', 'done']);
    expect(sizes()).toEqual(['row', 'row', 'open', 'closed', 'row']);
    expect(text(row(4))).toContain('1 round, 60 minutes · 8 of 16 lessons learned');
    expect(row(5)?.querySelectorAll('[data-round-segment="solid"]').length).toBe(0);
  });
});

describe('stopping a plan', () => {
  it('asks in place: what stopping does, five reasons that can be skipped, stop or keep going', async () => {
    await draw(northwindSeniorPlan, seniorInProgress);
    await press('Stop this plan');
    expect(boxKind()).toBe('asking');
    expect(text(box())).toBe(
      'Stop this plan? It leaves your plans, here and in Learn. What you learned stays learned, and you can start the plan again at any time. Why are you stopping? You can skip this. I was only looking My interview is over I chose another plan This plan does not fit me Something else Stop this plan Keep going',
    );
    expect(box()?.querySelector('.grid')?.className).toContain('grid-cols-1');
    expect(box()?.querySelector('.grid')?.className).toContain('sm:grid-cols-2');
    await press('Keep going');
    expect(boxKind()).toBe('progress');
    expect(onStop).not.toHaveBeenCalled();
  });

  it('sends the reason picked, or none when skipped', async () => {
    await draw(northwindSeniorPlan, seniorInProgress);
    await press('Stop this plan');
    const reason = box()?.querySelector('[data-stop-reason="interview_over"] input') as HTMLInputElement;
    await act(async () => reason.click());
    expect(box()?.querySelector('[data-stop-reason="interview_over"]')?.className).toContain('border-foreground');
    expect(onStop).not.toHaveBeenCalled();
    await press('Stop this plan', box() ?? undefined);
    expect(onStop).toHaveBeenCalledWith('interview_over');

    await draw(northwindSeniorPlan, seniorRoundDone);
    await press('Stop this plan');
    await press('Stop this plan', box() ?? undefined);
    expect(onStop).toHaveBeenLastCalledWith(null);
  });

  it('keeps the question with a line when the stop did not go through', async () => {
    onStop.mockImplementationOnce(async () => false);
    await draw(northwindSeniorPlan, seniorInProgress);
    await press('Stop this plan');
    await press('Stop this plan', box() ?? undefined);
    expect(boxKind()).toBe('asking');
    expect(text(box()?.querySelector('[role="alert"]'))).toBe(PLAN_SEND_FAILED.stop);
  });

  it('says right after that the plan is stopped, and offers to start it again', async () => {
    const stopped: Mine = { ...seniorStopped, rounds: seniorInProgress.rounds, stoppedAt: '2026-11-27T11:00:00.000Z' };
    await draw(northwindSeniorPlan, stopped, { stoppedNow: true });
    expect(text(box())).toBe(
      'You stopped this plan 27 Nov It is no longer among your plans. The 18 lessons you learned in it stay learned. Start this plan again',
    );
    await press('Start this plan again');
    expect(onStart).toHaveBeenCalledOnce();
    await draw(northwindSeniorPlan, { ...stopped, rounds: tallgrassStarted.rounds.slice(0, 0) }, { stoppedNow: true });
    expect(text(box())).toBe('You stopped this plan 27 Nov It is no longer among your plans. Start this plan again');
    expectCleanCopy();
  });
});
