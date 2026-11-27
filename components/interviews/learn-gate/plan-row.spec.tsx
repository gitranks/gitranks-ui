// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { LearnPlanRowLive, LearnPlanRowView } = await import('./plan-row');
const { resetInterviewsViewer } = await import('@/components/interviews/interviews-viewer');
const { learnPlanRowOf } = await import('@/lib/interviews/learn-course');
const { midFinishedRow, myHomeNone, myHomeOne, myHomeTwo, seniorRow, tallgrassRow } = await import(
  '@/lib/interviews/__fixtures__/mine'
);
const { justDoneRow, longNameRow } = await import('@/lib/interviews/__fixtures__/mine-page');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DASH = String.fromCodePoint(0x2014);

type Served = Parameters<typeof LearnPlanRowLive>[0]['served'];

function drawn(served: Served) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(<LearnPlanRowLive served={served} />);
  return host;
}

const read = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
/** What a phone shows of the row: the parts hidden on a small screen left out. */
const onPhone = (host: Element) => {
  const copy = host.cloneNode(true) as Element;
  for (const part of copy.querySelectorAll('.max-sm\\:hidden')) part.remove();
  return read(copy.querySelector('[data-plan-row-next]'));
};
/** What a wide screen shows of the row. */
const onWide = (host: Element) => {
  const copy = host.cloneNode(true) as Element;
  for (const part of copy.querySelectorAll('.sm\\:hidden')) part.remove();
  return read(copy.querySelector('[data-plan-row-next]'));
};

describe('the row of the plan to go on with', () => {
  it('names the plan, where the person stands and the next part, and leads to its lesson inside the plan', () => {
    const host = drawn(myHomeOne);
    expect(onWide(host)).toBe(
      'Your interview planNorthwind · Senior software engineerRound 3 of 5 · Next: Graphs, 11 lessons',
    );
    expect(host.querySelector('[data-plan-row-next]')!.getAttribute('href')).toBe(
      '/learn/lessons/graphs-4?plan=northwind/senior-software-engineer',
    );
    expect(host.querySelector('[data-plan-row] [data-company-logo="northwind"]')!.getAttribute('width')).toBe('28');
    expect(host.querySelector('[data-plan-row-more]')).toBeNull();
    expect(host.querySelector('button')).toBeNull();
  });

  it('puts where the person stands under the name on a phone, the same words', () => {
    const host = drawn(myHomeOne);
    expect(onPhone(host)).toBe(
      'Your interview planNorthwind · Senior software engineerRound 3 of 5 · Next: Graphs, 11 lessons',
    );
    expect(host.querySelectorAll('[data-plan-row-next] .sm\\:hidden')).toHaveLength(1);
    expect(host.querySelectorAll('[data-plan-row-next] .max-sm\\:hidden')).toHaveLength(1);
  });

  it('leads to the other plans on My interviews', () => {
    const more = drawn(myHomeTwo).querySelector('[data-plan-row-more]')!;
    expect(more.textContent).toBe('1 more plan');
    expect(more.getAttribute('href')).toBe('/interviews/mine');
    expect(read(drawn({ plans: [seniorRow, tallgrassRow, longNameRow] }).querySelector('[data-plan-row-more]'))).toBe(
      '2 more plans',
    );
  });

  it('keeps a long name whole', () => {
    expect(read(drawn({ plans: [longNameRow] }).querySelector('.text-pretty'))).toBe(
      'Northwind · Site reliability engineer, mid level and senior, all teams and all offices',
    );
  });

  it('says a round is just done, and names the next round', () => {
    expect(onWide(drawn({ plans: [justDoneRow] }))).toContain(
      'Round 2 of 5 is done · Next: Coding interviews, round 3',
    );
  });

  it('is not drawn with no plan, with every round done, or with nothing known', () => {
    for (const served of [null, myHomeNone, { plans: [midFinishedRow] }, { plans: [{ ...seniorRow, next: null }] }]) {
      expect(drawn(served).innerHTML).toBe('');
    }
  });

  it('holds no long dash and no zero', () => {
    const text = [myHomeOne, myHomeTwo, { plans: [justDoneRow] }, { plans: [longNameRow] }]
      .map((served) => drawn(served).textContent)
      .join(' ');
    expect(text).not.toContain(LONG_DASH);
    expect(text).not.toMatch(/\b0\b/);
  });

  it('draws what it is given', () => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(<LearnPlanRowView row={learnPlanRowOf(myHomeTwo)!} className="-mb-6" />);
    expect(host.querySelector('[data-plan-row]')!.className).toContain('-mb-6');
  });
});

describe('the row, as this browser knows it', () => {
  let host: HTMLDivElement;
  let root: Root;
  const fetchMock = vi.fn();
  const paths = () => fetchMock.mock.calls.map(([path]) => path as string);

  const draw = (served?: Served) =>
    act(async () => {
      root.render(<LearnPlanRowLive {...(served !== undefined ? { served } : {})} />);
    });
  const routes = (open: boolean, home: unknown) =>
    fetchMock.mockImplementation(async (path: string) =>
      Response.json(path === '/api/me/interviews/open' ? { open } : { home }),
    );

  beforeEach(() => {
    resetInterviewsViewer();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    hint.present = false;
    vi.unstubAllGlobals();
  });

  it('asks nothing for a visitor', async () => {
    routes(true, myHomeOne);
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.innerHTML).toBe('');
  });

  it('asks only whether Interviews is open for a person it is closed to, and draws nothing', async () => {
    hint.present = true;
    routes(false, myHomeOne);
    await draw();
    expect(paths()).toEqual(['/api/me/interviews/open']);
    expect(host.innerHTML).toBe('');
  });

  it("reads the person's plans once Interviews is open to them, and draws the row in place", async () => {
    hint.present = true;
    routes(true, myHomeTwo);
    await draw();
    expect(paths()).toEqual(['/api/me/interviews/open', '/api/me/interviews/home']);
    expect(host.querySelector('[data-plan-row-more]')!.textContent).toBe('1 more plan');
  });

  it('draws nothing when the read fails', async () => {
    hint.present = true;
    fetchMock.mockImplementation(async (path: string) =>
      path === '/api/me/interviews/open' ? Response.json({ open: true }) : new Response(null, { status: 500 }),
    );
    await draw();
    expect(host.innerHTML).toBe('');
  });

  it('draws the served plans without asking', async () => {
    hint.present = true;
    await draw(myHomeOne);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-plan-row]')).not.toBeNull();
  });
});
