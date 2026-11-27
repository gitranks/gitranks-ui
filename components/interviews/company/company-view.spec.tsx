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
vi.mock('next-auth/react', () => ({ signIn: vi.fn(async () => undefined) }));

const { CompanyView } = await import('./company-view');
const { northwindPage, tallgrassPage } = await import('@/lib/interviews/__fixtures__/companies');
const { seniorRow, tallgrassRow } = await import('@/lib/interviews/__fixtures__/mine');
type Page = typeof northwindPage;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  hint.present = true;
  fetchMock.mockReset().mockResolvedValue(new Response('{"ok":true,"data":true}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const draw = (page: Page, mine = [] as (typeof seniorRow)[], reading = false) =>
  act(async () => root.render(<CompanyView page={page} mine={mine} reading={reading} />));
const text = () => host.textContent ?? '';
const section = (name: string) => host.querySelector(`[data-company-section="${name}"]`) as HTMLElement | null;
const rowsOf = (position: string) =>
  [...host.querySelectorAll(`[data-position="${position}"] li`)].map((row) => row.textContent);
const linkNamed = (name: string, within: ParentNode = host) =>
  [...within.querySelectorAll('a')].find((link) => link.textContent?.trim() === name) ?? null;
const buttonIn = (within: ParentNode, name: string) =>
  [...within.querySelectorAll('button')].find((button) => button.textContent?.trim() === name) ?? null;
const press = (button: HTMLButtonElement | null) => act(async () => button?.click());

describe("a company's page for a visitor (the full case)", () => {
  it('says what it is: the title with the logo, the line, the counts, the day of the check and the notice', async () => {
    await draw(northwindPage);
    const title = host.querySelector('h1');
    expect(title?.textContent).toBe('Northwind interviews');
    expect(title?.querySelector('img[data-company-logo="northwind"]')?.getAttribute('width')).toBe('40');
    expect(linkNamed('All companies')?.getAttribute('href')).toBe('/interviews');
    expect(text()).toContain('How Northwind interviews engineers, and a plan to prepare for each position.');
    expect(host.querySelector('[data-company-counts]')?.textContent).toBe(
      '7 plans · 3 positions · last checked 26 Nov 2026',
    );
    expect(text()).toContain('Not an official Northwind page. Built from public sources.');
    expect(host.querySelector('[data-company-box]')).toBeNull();
    expect(host.querySelector('[data-your-plan]')).toBeNull();
  });

  it('lists the plans by position and then by level, each row a link with its level, its names and its size', async () => {
    await draw(northwindPage);
    const headings = [...(section('plans')?.querySelectorAll('h3') ?? [])].map((one) => one.textContent);
    expect(headings).toEqual(['Software engineer', 'Site reliability engineer', 'Engineering manager']);
    expect(rowsOf('software-engineer')).toEqual([
      'Entry level · N14 rounds · 43 lessons',
      'Mid level · N25 rounds · 57 lessons',
      'Senior · N35 rounds · 65 lessons',
      'Staff · N45 rounds · 54 lessons',
    ]);
    expect(rowsOf('site-reliability-engineer')).toEqual([
      'Mid level and senior · N2 and N34 rounds · 38 lessons',
      'Staff · N44 rounds · 34 lessons',
    ]);
    expect(rowsOf('engineering-manager')).toEqual(['All levels4 rounds · 29 lessons']);
    expect(host.querySelector('[data-plan="senior-software-engineer"] a')?.getAttribute('href')).toBe(
      '/interviews/northwind/senior-software-engineer',
    );
    expect(section('plans')?.textContent).toContain(
      'No plan for data engineer yet: public sources do not describe those interviews at Northwind well enough.',
    );
  });

  it('says how the company hires, each fact with who states it, how long it takes last', async () => {
    await draw(northwindPage);
    const hires = section('process') as HTMLElement;
    expect(hires.querySelector('h2')?.textContent).toBe('How Northwind hires');
    expect(hires.textContent).toContain('True for every interview there, whatever the position.');
    const facts = [...hires.querySelectorAll('[data-fact]')];
    expect(facts.map((fact) => fact.getAttribute('data-fact'))).toEqual([
      'process/ai-in-interviews',
      'process/video-or-in-person',
      'process/hiring-committee',
      'process/team-matching',
      'timeline',
    ]);
    expect(facts[0].textContent).toBe(
      'Help from AINorthwind statesNot allowed in live rounds. Northwind says any use ends the interview.',
    );
    expect(facts[2].querySelector('[data-basis]')?.textContent).toBe('Northwind and candidates');
    expect(facts[4].textContent).toBe(
      'How long it takesCandidates report4 to 8 weeks. From the first call to the offer.',
    );
    expect(buttonIn(hires, '4 sources')).not.toBeNull();
    expect(buttonIn(hires, 'This is wrong')).not.toBeNull();
    expect(hires.querySelector('[data-company-door]')).toBeNull();
  });

  it("says what it looks for, then the door to the company's own course", async () => {
    await draw(northwindPage);
    const values = section('values') as HTMLElement;
    expect(values.querySelector('h2')?.textContent).toBe('What Northwind looks for');
    expect(values.textContent).toContain('The two things Northwind states it looks for.');
    expect([...values.querySelectorAll('[data-fact]')].map((fact) => fact.textContent)).toEqual([
      'OwnershipNorthwind statesYou follow a problem to its end, past the edge of your own team.',
      'Clear writingNorthwind and candidatesDecisions are made in short written notes, and you are asked about yours.',
    ]);
    const door = values.querySelector('[data-company-door="course"]');
    expect(door?.getAttribute('href')).toBe('/learn/courses/interviewing-at-northwind');
    expect(door?.textContent).toBe(
      'Interviewing at NorthwindA course of 12 lessons on how Northwind hires and what it looks for',
    );
  });

  it("lists the company's own pages, each with its site, its date and its line", async () => {
    await draw(northwindPage);
    const official = section('official') as HTMLElement;
    expect(official.querySelector('h2')?.textContent).toBe("Northwind's own pages");
    expect(official.textContent).toContain('What Northwind itself publishes about its interviews.');
    expect([...official.querySelectorAll('[data-source]')].map((one) => one.textContent)).toEqual([
      'How we interviewcareers.northwind.example · May 2026What each round checks, and how to get ready for it.',
      'Using AI in our interviewscareers.northwind.example · Feb 2026AI tools are not allowed in live rounds.',
    ]);
    expect(official.querySelector('[data-source="o1"] a')?.getAttribute('target')).toBe('_blank');
    expect(buttonIn(official, 'This is wrong')).not.toBeNull();
  });

  it("leads to Learn's courses with the name typed, and to its open-source projects", async () => {
    await draw(northwindPage);
    const gitranks = section('gitranks') as HTMLElement;
    expect(gitranks.querySelector('h2')?.textContent).toBe('Northwind on GitRanks');
    const courses = gitranks.querySelector('[data-company-door="courses"]');
    expect(courses?.getAttribute('href')).toBe('/learn/courses?q=Northwind');
    expect(courses?.textContent).toBe("Courses for Northwind's interviews4 courses in Learn that its plans use.");
    const org = gitranks.querySelector('[data-company-door="org"]');
    expect(org?.getAttribute('href')).toBe('/org/northwind-example');
    expect(org?.textContent).toContain("Northwind's open-source projects");
  });

  it('ends with where the facts come from, the day of the check and how we research', async () => {
    await draw(northwindPage);
    const foot = host.querySelector('[data-company-foot]');
    expect(foot?.textContent).toBe(
      'Facts from 8 public sources, written in our own words · last checked 26 Nov 2026 · How we research',
    );
    expect(linkNamed('How we research')?.getAttribute('href')).toBe('/interviews/about');
  });

  it('draws its sections in reading order', async () => {
    await draw(northwindPage);
    expect(
      [...host.querySelectorAll('[data-company-section]')].map((one) => one.getAttribute('data-company-section')),
    ).toEqual(['plans', 'process', 'values', 'official', 'gitranks']);
  });
});

describe('the sources and "This is wrong" in place', () => {
  it('opens the sources under their section, and the line on what they disagree on under the last section of facts', async () => {
    await draw(northwindPage);
    const hires = section('process') as HTMLElement;
    await press(buttonIn(hires, '4 sources'));
    expect(hires.textContent).toContain('Where these facts come from');
    expect(hires.textContent).toContain('We read these on 26 Nov 2026 and wrote the facts in our own words.');
    expect(hires.textContent).not.toContain('Sources disagree');
    const values = section('values') as HTMLElement;
    await press(buttonIn(values, '2 sources'));
    expect(values.textContent).toContain(
      'Sources disagree on 3 points, for example whether the team match comes before or after the decision.',
    );
  });

  it('puts the line on disagreements under how the company hires when the values name no source to open', async () => {
    await draw({ ...northwindPage, values: northwindPage.values.map((value) => ({ ...value, sources: ['nowhere'] })) });
    const values = section('values') as HTMLElement;
    expect(buttonIn(values, 'This is wrong')).not.toBeNull();
    expect([...values.querySelectorAll('button')].some((button) => /sources?$/.test(button.textContent ?? ''))).toBe(
      false,
    );
    const hires = section('process') as HTMLElement;
    await press(buttonIn(hires, '4 sources'));
    expect(hires.textContent).toContain('Sources disagree on 3 points');
  });

  it('draws the sources line quiet while closed and strong while open', async () => {
    await draw(northwindPage);
    const toggle = buttonIn(section('process') as HTMLElement, '4 sources');
    expect(toggle?.className).toContain('text-muted-foreground');
    expect(toggle?.className).not.toContain('font-semibold');
    await press(toggle);
    expect(toggle?.className).toContain('font-semibold text-foreground');
  });

  it.each([
    ['process', 'process'],
    ['values', 'values'],
    ['official', 'official'],
  ])('sends a report from the %s section with its key and no plan', async (name, fact) => {
    await draw(northwindPage);
    const part = section(name) as HTMLElement;
    await press(buttonIn(part, 'This is wrong'));
    const field = part.querySelector('textarea') as HTMLTextAreaElement;
    expect(field).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(field, 'It changed.');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => part.querySelector('form')?.requestSubmit());
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ company: 'northwind', plan: null, fact, note: 'It changed.' });
    expect(part.textContent).toContain('Thank you.');
  });
});

describe("a company's page, the small case", () => {
  it('has no values, no course and no logo, and leaves out what it does not have', async () => {
    await draw(tallgrassPage);
    expect(host.querySelector('h1 [data-company-letter]')?.textContent).toBe('T');
    expect(host.querySelector('[data-company-counts]')?.textContent).toBe(
      '1 plan · 1 position · last checked 26 Nov 2026',
    );
    expect(rowsOf('site-reliability-engineer')).toEqual(['All levels3 rounds · 16 lessons']);
    expect(section('plans')?.textContent).not.toMatch(/No plan for|Where sources/);
    expect(section('values')).toBeNull();
    expect(host.querySelector('[data-company-door="course"]')).toBeNull();
    expect(host.querySelector('[data-company-door="org"]')).toBeNull();
    expect(host.querySelector('[data-company-door="courses"]')?.getAttribute('href')).toBe(
      '/learn/courses?q=Tallgrass',
    );
    expect(text()).toContain('Tallgrass states');
    expect(text()).toContain('1 source');
  });

  it("moves the course's door under how the company hires when there are no values", async () => {
    await draw({
      ...tallgrassPage,
      course: { slug: 'interviewing-at-tallgrass', name: 'Interviewing at Tallgrass', lessons: 9 },
    });
    const door = section('process')?.querySelector('[data-company-door="course"]');
    expect(door?.textContent).toBe('Interviewing at TallgrassA course of 9 lessons on how Tallgrass hires');
  });

  it('draws no section with nothing in it, heading included', async () => {
    await draw({
      ...tallgrassPage,
      process: [],
      timeline: null,
      official: [],
      courses: 0,
      githubOrg: null,
      sources: [],
    });
    expect(
      [...host.querySelectorAll('[data-company-section]')].map((one) => one.getAttribute('data-company-section')),
    ).toEqual(['plans']);
    expect(host.querySelector('[data-company-foot]')?.textContent).toBe(
      'Facts written in our own words · last checked 26 Nov 2026 · How we research',
    );
  });
});

describe("a company's page for a person with a plan in progress there", () => {
  it('goes on with it in one box on top, and marks its row', async () => {
    await draw(northwindPage, [seniorRow]);
    const box = host.querySelector('[data-company-box]') as HTMLElement;
    expect(box.getAttribute('aria-label')).toBe('What to do now');
    expect(box.querySelector('h2')?.textContent).toBe('Your plan: Senior software engineer');
    expect(box.textContent).toContain('round 3 of 5');
    expect([...box.querySelectorAll('[data-round-mark]')].map((mark) => mark.getAttribute('data-round-mark'))).toEqual([
      'done',
      'done',
      'here',
      'ahead',
      'ahead',
    ]);
    expect(box.textContent).toContain('Next: Graphs, 11 lessons');
    expect(linkNamed('Continue with Graphs', box)?.getAttribute('href')).toBe(
      '/learn/lessons/graphs-4?plan=northwind/senior-software-engineer',
    );
    expect(linkNamed('Open the plan', box)?.getAttribute('href')).toBe(
      '/interviews/northwind/senior-software-engineer',
    );
    expect(box.textContent).toContain('Your interview plans are not publicly visible.');
    expect(host.querySelector('[data-plan="senior-software-engineer"] [data-your-plan]')?.textContent).toBe(
      'Your plan · round 3 of 5',
    );
    expect(host.querySelectorAll('[data-your-plan]')).toHaveLength(1);
  });

  it('offers the plan alone when the read names no next thing', async () => {
    await draw(tallgrassPage, [{ ...tallgrassRow, next: null, here: null }]);
    const box = host.querySelector('[data-company-box]') as HTMLElement;
    expect([...box.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Open the plan']);
    expect(box.textContent).not.toContain('round');
    expect(host.querySelector('[data-your-plan]')?.textContent).toBe('Your plan');
  });

  it('keeps the sections hidden in their place while the person is read', async () => {
    await draw(northwindPage, [], true);
    const held = host.querySelector('[data-company-held]');
    expect(held?.getAttribute('aria-busy')).toBe('true');
    expect(held?.className).toContain('[html[data-has-session]_&]:invisible');
    expect(host.querySelector('h1')?.closest('[data-company-held]')).toBeNull();
  });
});

describe("a company's page as a person reads it", () => {
  it('never draws a count of nothing', async () => {
    for (const page of [northwindPage, tallgrassPage]) {
      await draw(page, page === northwindPage ? [seniorRow] : []);
      expect(text()).not.toMatch(/\b0 \w/);
    }
  });
});
