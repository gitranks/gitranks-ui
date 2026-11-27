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

const { ProjectsView } = await import('./projects-view');
const { ProjectsLive } = await import('./projects-live');
const { buildProjectsFourteen, projectsMine, buildProjectsThree } = await import('@/lib/build/__fixtures__/home');
const { buildProjectsFew } = await import('@/lib/build/__fixtures__/projects');

describe('All projects', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    hint.present = true;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const cards = () =>
    [...container.querySelectorAll('[data-project-card]')].map((card) => card.getAttribute('data-project-card'));
  const groups = () =>
    [...container.querySelectorAll('[data-projects-group] h2')].map((heading) => heading.textContent);
  const count = () => container.querySelector('[data-projects-count]')?.textContent ?? null;
  const input = () => container.querySelector<HTMLInputElement>('input[type="search"]');
  const type = async (value: string) => {
    const field = input();
    if (!field) throw new Error('no search box');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  it('draws few projects as one grid, with no search and no groups', async () => {
    await act(async () => root.render(<ProjectsView projects={buildProjectsFew} mine={null} />));
    expect(container.querySelector('h1')?.textContent).toBe('Projects');
    expect(input()).toBeNull();
    expect(groups()).toEqual([]);
    expect(cards()).toEqual(buildProjectsFew.map((card) => card.slug));
    expect(container.querySelector('a[href="/build/mcp-server"]')?.textContent).toContain(
      'Easy · 16 steps · about an hour and a half',
    );
    expect(container.querySelector('[data-build-foot]')?.textContent).toBe(
      'New projects are added one at a time. How Build works',
    );
  });

  it('keeps an odd last card in the grid like the others', async () => {
    await act(async () => root.render(<ProjectsView projects={buildProjectsThree} mine={null} />));
    expect(container.querySelector('ul')?.className).toContain('sm:grid-cols-2');
    expect(cards()).toHaveLength(3);
  });

  it('groups many projects by subject, with a search box and how many', async () => {
    await act(async () => root.render(<ProjectsView projects={buildProjectsFourteen} mine={null} />));
    expect(groups()).toEqual(['AI', 'Languages', 'Data', 'The web', 'Tools']);
    expect(count()).toBe('14 projects');
    expect(cards()).toHaveLength(14);
  });

  it('filters as the person types, leaving out a group with no match', async () => {
    await act(async () => root.render(<ProjectsView projects={buildProjectsFourteen} mine={null} />));
    await type('server');
    expect(groups()).toEqual(['AI', 'The web']);
    expect(cards()).toEqual(['mcp-server', 'web-server']);
    expect(count()).toBe('2 of 14 shown');
  });

  it('says nothing matches in one line, with no zero, and shows all again', async () => {
    await act(async () =>
      root.render(<ProjectsView projects={buildProjectsFourteen} mine={null} query="kubernetes" />),
    );
    expect(container.querySelector('[data-projects-nothing]')?.textContent).toBe(
      'No project matches “kubernetes”. Show all 14',
    );
    expect(count()).toBe('');
    expect(container.querySelector('[data-projects-nothing]')?.className).toContain('break-words');
    expect(container.textContent).not.toMatch(/\b0\b/);
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === 'Show all 14');
    await act(async () => button?.click());
    expect(cards()).toHaveLength(14);
    expect(input()?.value).toBe('');
  });

  it("shows a person's place above the facts, and keeps the line on every card", async () => {
    await act(async () => root.render(<ProjectsView projects={buildProjectsFourteen} mine={projectsMine} />));
    const placeOf = (slug: string) => container.querySelector(`[data-project-card="${slug}"] [data-card-place]`);
    expect(placeOf('mcp-server')?.textContent).toBe('Step 9 of 16');
    expect(placeOf('key-value-database')?.textContent).toBe('Every step done, the test is left');
    expect(placeOf('web-server')?.textContent).toBe('Repeated after a weekAnswered every step');
    expect(placeOf('json-parser')?.textContent).toBe('Built');
    expect(placeOf('coding-agent')?.textContent).toBe('');
    expect(container.querySelectorAll('[data-card-place]')).toHaveLength(14);
    expect(cards()[0]).toBe('mcp-server');
  });

  it("keeps the place line hidden for a visitor, shown from the first paint in a session's browser", async () => {
    await act(async () => root.render(<ProjectsView projects={buildProjectsFew} mine={null} />));
    const line = container.querySelector('[data-card-place]');
    expect(line?.className).toContain('hidden');
    expect(line?.className).toContain('[html[data-has-session]_&]:flex');
  });

  it("reads the person's builds once in the browser, and nothing for a visitor", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ builds: projectsMine })));
    vi.stubGlobal('fetch', fetch);
    await act(async () => root.render(<ProjectsLive projects={buildProjectsFew} />));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-project-card="mcp-server"] [data-card-place]')?.textContent).toBe(
      'Step 9 of 16',
    );
    await act(async () => root.unmount());
    root = createRoot(container);
    hint.present = false;
    fetch.mockClear();
    await act(async () => root.render(<ProjectsLive projects={buildProjectsFew} />));
    expect(fetch).not.toHaveBeenCalled();
  });
});
