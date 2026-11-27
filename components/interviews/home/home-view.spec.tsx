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
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const hint = vi.hoisted(() => ({ present: false }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { InterviewsHomeView } = await import('./home-view');
const { InterviewsHomeLive } = await import('./home-live');
const { interviewsHomeViewOf, LANDING_HOME_VIEW } = await import('@/lib/interviews/home');
const { EMPTY_INTERVIEWS_HOME } = await import('@/lib/interviews/home.data');
const { interviewsHome } = await import('@/lib/interviews/__fixtures__/companies');
const { interviewsHomeMany } = await import('@/lib/interviews/__fixtures__/home');
const { myHomeOne, myHomeTwo, tallgrassRow } = await import('@/lib/interviews/__fixtures__/mine');

vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

describe('Interviews home', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    router.push.mockReset();
    hint.present = false;
    window.history.replaceState(null, '', '/interviews');
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const draw = async (home = interviewsHome, view = LANDING_HOME_VIEW, reading = false) =>
    act(async () => root.render(<InterviewsHomeView home={home} view={view} reading={reading} />));
  const text = () => container.textContent ?? '';
  const headings = () => [...container.querySelectorAll('h1, h2')].map((heading) => heading.textContent);
  const field = () => container.querySelector<HTMLInputElement>('input[role="combobox"]');
  const line = () => container.querySelector('[data-field-line]')?.textContent ?? '';
  const cards = () =>
    [...container.querySelectorAll('[data-company-card]')].map((card) => card.getAttribute('data-company-card'));
  const rows = () =>
    [...container.querySelectorAll('[data-plan-row]')].map((row) =>
      [row.querySelector('[data-plan-row-name]'), row.querySelector('[data-plan-row-right]')]
        .map((part) => part?.textContent ?? '')
        .join(' | '),
    );
  const suggestions = () =>
    [...container.querySelectorAll('[role="option"]')].map((option) =>
      [option.querySelector('[data-suggestion-name]'), option.querySelector('[data-suggestion-line]')]
        .map((part) => part?.textContent ?? '')
        .join(' | '),
    );
  const chips = () =>
    [...container.querySelectorAll('[data-chip]')].map((chip) => chip.querySelector('[data-chip-name]')?.textContent);
  const button = (name: string) => [...container.querySelectorAll('button')].find((one) => one.textContent === name);
  const link = (name: string) =>
    [...container.querySelectorAll('a')].find((a) => a.textContent === name)?.getAttribute('href') ?? null;

  /** Types into the search as a person does: the field focused, then its value changed. */
  const type = async (value: string) =>
    act(async () => {
      const input = field();
      if (!input) throw new Error('no field');
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const press = async (key: string) =>
    act(async () => {
      field()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
  const click = async (element: Element | null | undefined) =>
    act(async () => {
      if (!element) throw new Error('nothing to press');
      (element as HTMLElement).click();
    });

  it('draws the landing for a visitor: what a plan is, the search, the companies, three steps, the facts, questions', async () => {
    await draw();
    expect(headings()).toEqual([
      'Prepare for the interview at the company you want',
      'Companies',
      'How it works',
      'Where the facts come from',
      'Questions',
    ]);
    expect(text()).toContain('Free. Your interview plans are not publicly visible.');
    expect(field()?.placeholder).toBe('Find a company or a position');
    expect(line()).toBe('');
    expect(text()).toContain('Two to start with. More come when public sources describe');
    expect(cards()).toEqual(['northwind', 'tallgrass']);
    expect(text()).toContain('Software engineer, site reliability engineer, engineering manager');
    expect(text()).toContain('7 plans');
    expect(text()).toContain('1 plan');
    expect(container.querySelectorAll('ol li')).toHaveLength(3);
    expect(link('How we research')).toBe('/interviews/about#interviews-about-facts');
    expect(container.querySelector('[data-interviews-home]')?.getAttribute('data-interviews-home')).toBe('landing');
    expect(text()).not.toContain('Your plan');
  });

  it('draws a company with no logo with its first letter in the same square', async () => {
    await draw();
    expect(
      container.querySelector('[data-company-card="northwind"] img[data-company-logo="northwind"]'),
    ).not.toBeNull();
    const letter = container.querySelector('[data-company-card="tallgrass"] [data-company-letter]');
    expect(letter?.textContent).toBe('T');
  });

  it('opens a question in place, the others staying closed', async () => {
    await draw();
    const question = button('Does anyone see which interview I prepare for?');
    expect(question?.getAttribute('aria-expanded')).toBe('false');
    await click(question);
    expect(question?.getAttribute('aria-expanded')).toBe('true');
    const answer = document.getElementById(question?.getAttribute('aria-controls') ?? '');
    expect(answer?.hidden).toBe(false);
    expect(answer?.textContent).toContain('Your interview plans are not publicly visible.');
    expect(button('Is a plan official?')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('offers companies and positions while typing, with the letters marked, and leaves the list as it was', async () => {
    await draw();
    await type('t');
    expect(suggestions()).toEqual(['Tallgrass | company · 1 plan']);
    expect(container.querySelector('[role="option"] b')?.textContent).toBe('T');
    expect(line()).toBe('1 company');
    await type('s');
    expect(suggestions()).toEqual([
      'Software engineer | position · 4 plans at 1 company',
      'Site reliability engineer | position · 3 plans at 2 companies',
    ]);
    expect(container.querySelectorAll('[data-suggestion="position"] svg')).toHaveLength(2);
    expect(line()).toBe('2 positions');
    expect(cards()).toEqual(['northwind', 'tallgrass']);
  });

  it('opens a company chosen alone', async () => {
    await draw();
    await type('north');
    await click(container.querySelector('[role="option"]'));
    expect(router.push).toHaveBeenCalledWith('/interviews/northwind');
  });

  it('keeps a chosen position as a chip and turns the list into its plans, the address keeping it', async () => {
    await draw();
    await type('site');
    await press('Enter');
    expect(chips()).toEqual(['Site reliability engineer']);
    expect(field()?.value).toBe('');
    expect(line()).toBe('3 plans at 2 companies');
    expect(headings()).toContain('Plans for a site reliability engineer');
    expect(text()).toContain('One plan for each company and level that public sources describe.');
    expect(rows()).toEqual([
      'Northwind · , Site reliability engineer, mid level and senior, N2 and N3 | 4 rounds · 38 lessons',
      'Northwind · , Staff site reliability engineer, N4 | 4 rounds · 34 lessons',
      'Tallgrass · , Site reliability engineer, all levels | 3 rounds · 16 lessons',
    ]);
    expect(container.querySelector('[data-plan-row="tallgrass/site-reliability-engineer"]')?.getAttribute('href')).toBe(
      '/interviews/tallgrass/site-reliability-engineer',
    );
    expect(window.location.search).toBe('?position=site-reliability-engineer');
    expect(cards()).toEqual([]);
  });

  it('narrows the list with a company and a position together, the company as a second chip', async () => {
    await draw();
    await type('site');
    await press('Enter');
    await type('tall');
    expect(suggestions()).toEqual(['Tallgrass | company · 1 plan']);
    await press('Enter');
    expect(router.push).not.toHaveBeenCalled();
    expect(chips()).toEqual(['Tallgrass', 'Site reliability engineer']);
    expect(line()).toBe('1 plan');
    expect(container.querySelectorAll('[data-plan-row]')).toHaveLength(1);
    expect(headings()).toContain('Plans for a site reliability engineer at Tallgrass');
    // Backspace in the empty field takes the company out first.
    await press('Backspace');
    expect(chips()).toEqual(['Site reliability engineer']);
  });

  it('takes a chip out with its own button, and goes back to the companies', async () => {
    await draw();
    await type('site');
    await press('Enter');
    await click(container.querySelector('button[aria-label="Remove Site reliability engineer"]'));
    expect(chips()).toEqual([]);
    expect(cards()).toEqual(['northwind', 'tallgrass']);
    expect(window.location.search).toBe('');
  });

  it('opens with the position the address keeps', async () => {
    window.history.replaceState(null, '', '/interviews?position=engineering-manager');
    await draw();
    expect(chips()).toEqual(['Engineering manager']);
    expect(headings()).toContain('Plans for an engineering manager');
    expect(line()).toBe('1 plan at 1 company');
  });

  it('says so in its place when nothing matches, with one way back and no zero', async () => {
    await draw();
    await type('site');
    await press('Enter');
    await type('acme');
    expect(line()).toBe('No company or position');
    const nothing = container.querySelector('[data-search-nothing]');
    expect(nothing?.textContent).toContain(
      'No plan for “acme” yet. A company gets its plans when public sources describe its interviews well enough.',
    );
    expect(text()).not.toMatch(/\b0\b/);
    await click(button('Show all companies'));
    expect(chips()).toEqual([]);
    expect(field()?.value).toBe('');
    expect(cards()).toEqual(['northwind', 'tallgrass']);
  });

  it('lists the first twelve of many companies, and the rest in place on asking; the search finds the rest', async () => {
    await draw(interviewsHomeMany);
    expect(cards()).toHaveLength(12);
    expect(text()).toContain('More come when public sources describe');
    expect(text()).not.toContain('to start with');
    await click(button('All 16 companies'));
    expect(cards()).toHaveLength(16);
    expect(button('All 16 companies')).toBeUndefined();
    await type('zur');
    expect(suggestions()).toEqual(['Zürich Works | company · 1 plan']);
  });

  it('keeps only its top when the home read is empty: no search, no companies', async () => {
    await draw(EMPTY_INTERVIEWS_HOME);
    expect(field()).toBeNull();
    expect(headings()).toEqual([
      'Prepare for the interview at the company you want',
      'How it works',
      'Where the facts come from',
      'Questions',
    ]);
    expect(text()).toContain('Free. Your interview plans are not publicly visible.');
  });

  it("draws a person's home: the box of the plan to go on with, the other plans, the companies with theirs marked", async () => {
    await draw(interviewsHome, interviewsHomeViewOf(myHomeTwo));
    expect(container.querySelector('[data-interviews-home]')?.getAttribute('data-interviews-home')).toBe('mine');
    expect(headings()).toEqual(['Northwind · Senior software engineer', 'Your other plans', 'Companies']);
    const box = container.querySelector('[data-plan-box]');
    expect(box?.getAttribute('aria-label')).toBe('What to do now');
    expect(box?.textContent).toContain('round 3 of 5');
    expect(box?.querySelector('[data-plan-next]')?.textContent).toBe('Next: Graphs, 11 lessons');
    expect(
      [...(box?.querySelectorAll('[data-round-mark]') ?? [])].map((mark) => mark.getAttribute('data-round-mark')),
    ).toEqual(['done', 'done', 'started', 'to_come', 'to_come']);
    expect(link('Continue with Graphs')).toBe('/learn/lessons/graphs-4?plan=northwind/senior-software-engineer');
    expect(link('Open the plan')).toBe('/interviews/northwind/senior-software-engineer');
    expect(box?.textContent).toContain('Your interview plans are not publicly visible.');
    expect(rows()).toEqual(['Tallgrass · , Site reliability engineer, all levels | round 1 of 3']);
    expect(container.querySelectorAll('[data-company-card] .bg-brand-soft')).toHaveLength(2);
    expect(field()).not.toBeNull();
    expect(text()).not.toContain('Free. Your interview plans');
    expect(text()).not.toContain('Where the facts come from');
    expect(link('How Interviews works')).toBe('/interviews/about');
    expect(link('How we research')).toBe('/interviews/about#interviews-about-facts');
  });

  it('has no "Your other plans" with one plan, and marks only that company', async () => {
    await draw(interviewsHome, interviewsHomeViewOf(myHomeOne));
    expect(headings()).toEqual(['Northwind · Senior software engineer', 'Companies']);
    const marked = [...container.querySelectorAll('[data-company-card]')].filter((card) =>
      card.textContent?.includes('Your plan'),
    );
    expect(marked.map((card) => card.getAttribute('data-company-card'))).toEqual(['northwind']);
  });

  it("turns the person's companies into a position's plans in place, under the same heading's place", async () => {
    await draw(interviewsHome, interviewsHomeViewOf(myHomeOne));
    await type('manager');
    await press('Enter');
    expect(headings()).toEqual(['Northwind · Senior software engineer', 'Plans for an engineering manager']);
  });

  it('hides the page for a browser with a session while it reads, and says it is busy', async () => {
    await draw(interviewsHome, LANDING_HOME_VIEW, true);
    const main = container.querySelector('main');
    expect(main?.getAttribute('aria-busy')).toBe('true');
    expect(main?.className).toContain('[html[data-has-session]_&]:invisible');
  });

  it('puts the cursor in the field on a press in the box, and takes a chip out only by its own button', async () => {
    await draw();
    await type('site');
    await press('Enter');
    expect(container.querySelector('label')?.getAttribute('for')).toBe(field()?.id);
    await click(container.querySelector('[data-chip-name]'));
    await click(container.querySelector('[data-field-line]'));
    expect(chips()).toEqual(['Site reliability engineer']);
    await click(container.querySelector('button[aria-label="Remove Site reliability engineer"]'));
    expect(chips()).toEqual([]);
  });

  it('says what is missing for the chips when the letters find something without them', async () => {
    await draw();
    await type('manager');
    await press('Enter');
    await type('tall');
    expect(suggestions()).toEqual([]);
    expect(container.querySelector('[data-search-nothing]')?.textContent).toContain(
      'No plan for an engineering manager matches “tall”.',
    );
  });

  it('keeps the box that says nothing matches in its place when the field loses the cursor', async () => {
    await draw();
    await type('acme');
    await act(async () => field()?.blur());
    expect(container.querySelector('[data-search-nothing]')).not.toBeNull();
  });

  it('names a position’s single plan with "all levels" in the box too', async () => {
    await draw(interviewsHome, interviewsHomeViewOf({ plans: [tallgrassRow] }));
    // Tallgrass has no logo: its first letter stands in the heading's square.
    expect(headings()[0]).toBe('TTallgrass · Site reliability engineer, all levels');
  });

  it('shows the list once the position the address keeps is read', async () => {
    window.history.replaceState(null, '', '/interviews?position=site-reliability-engineer');
    document.documentElement.setAttribute('data-interviews-position', '');
    await draw();
    expect(document.documentElement.hasAttribute('data-interviews-position')).toBe(false);
    const list = container.querySelector('[data-home-list]');
    expect(list?.getAttribute('data-home-list')).toBe('plans');
    expect(list?.className).toContain('[html[data-interviews-position]_&]:invisible');
  });

  it('never draws a zero, in any state', async () => {
    for (const [home, view] of [
      [interviewsHome, LANDING_HOME_VIEW],
      [interviewsHomeMany, LANDING_HOME_VIEW],
      [interviewsHome, interviewsHomeViewOf(myHomeTwo)],
      [EMPTY_INTERVIEWS_HOME, LANDING_HOME_VIEW],
    ] as const) {
      await draw(home, view);
      expect(text()).not.toMatch(/(^|[^\d])0 /);
    }
  });

  describe('in the browser', () => {
    function serve(answers: Record<string, unknown>) {
      const asked: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (path: string) => {
          asked.push(path);
          return path in answers ? new Response(JSON.stringify(answers[path])) : new Response('{}', { status: 500 });
        }),
      );
      return asked;
    }
    const kind = () => container.querySelector('main')?.getAttribute('data-interviews-home');

    it('asks nothing for a visitor and shows the landing at once', async () => {
      const asked = serve({});
      await act(async () => root.render(<InterviewsHomeLive home={interviewsHome} />));
      expect(asked).toEqual([]);
      expect(kind()).toBe('landing');
      expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
    });

    it("becomes the person's home once their plans are read", async () => {
      hint.present = true;
      const asked = serve({ '/api/me/interviews/home': { home: myHomeTwo } });
      await act(async () => root.render(<InterviewsHomeLive home={interviewsHome} />));
      expect(asked).toEqual(['/api/me/interviews/home']);
      expect(kind()).toBe('mine');
      expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
    });

    it('stays the landing for a person with no plan in progress', async () => {
      hint.present = true;
      const asked = serve({ '/api/me/interviews/home': { home: { plans: [] } } });
      await act(async () => root.render(<InterviewsHomeLive home={interviewsHome} />));
      expect(asked).toEqual(['/api/me/interviews/home']);
      expect(kind()).toBe('landing');
      expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
    });

    it('stays the landing when the read fails', async () => {
      hint.present = true;
      const asked = serve({});
      await act(async () => root.render(<InterviewsHomeLive home={interviewsHome} />));
      expect(asked).toEqual(['/api/me/interviews/home']);
      expect(kind()).toBe('landing');
      expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
    });
  });
});
