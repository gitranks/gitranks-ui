// @vitest-environment jsdom
import type { Route } from 'next';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { doorsInProgress, doorsMany, doorsOne, doorsPlaces } from '@/lib/build/__fixtures__/doors';
import type { BuildDoors } from '@/lib/build/types';

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

const { CourseBuildLine } = await import('./course-build-line');
const { GoFurtherRows } = await import('./go-further-rows');
const { IssueBuildLine } = await import('./issue-build-line');
const { forgetBuildDoors } = await import('./doors-live');
const { resetBuildViewer } = await import('@/components/build/build-viewer');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The routes: whether Build is open to the person, and the doors of a course. */
const routes = (open: boolean, doors: BuildDoors | null) =>
  vi.fn(async (url: string) => {
    if (url === '/api/me/build/open') return Response.json({ open });
    if (url.startsWith('/api/me/build/doors?')) return Response.json({ doors });
    return new Response('not here', { status: 404 });
  });

const TODAY = <ul data-today="">today</ul>;
const PARTS = {
  next: { name: 'Databases and SQL', href: '/learn/courses/databases' as Route, lessons: 64 },
  issues: { open: 2, href: '/learn/courses/algorithms/real-world' as Route },
};
const LESSON = {
  slug: 'find-duplicates',
  title: 'Find duplicates in one pass with a set',
  href: '/learn/lessons/find-duplicates' as Route,
  learned: false,
};

describe('the doors into Build', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetBuildViewer();
    forgetBuildDoors();
    hint.present = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const draw = async (part: ReactNode) => {
    await act(async () => root.render(part));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  };
  const rows = () =>
    [...container.querySelectorAll('[data-further-row]')].map((row) => [
      row.getAttribute('data-further-row'),
      row.textContent,
    ]);

  it('are served as today: no line, and the list of "Go further" unchanged', () => {
    expect(renderToStaticMarkup(<CourseBuildLine course="algorithms" />)).toBe('');
    expect(renderToStaticMarkup(<IssueBuildLine lesson={LESSON} />)).toBe('');
    expect(renderToStaticMarkup(<GoFurtherRows course="algorithms" parts={PARTS} today={TODAY} />)).toBe(
      renderToStaticMarkup(TODAY),
    );
  });

  it('ask nothing for a visitor, and stay as today', async () => {
    hint.present = false;
    const fetch = routes(true, doorsOne);
    vi.stubGlobal('fetch', fetch);
    await draw(
      <>
        <CourseBuildLine course="algorithms" />
        <GoFurtherRows course="algorithms" parts={PARTS} today={TODAY} />
      </>,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(renderToStaticMarkup(TODAY));
  });

  it('stay as today for a person Build is not open to, reading no doors', async () => {
    const fetch = routes(false, doorsOne);
    vi.stubGlobal('fetch', fetch);
    await draw(
      <>
        <CourseBuildLine course="algorithms" />
        <GoFurtherRows course="algorithms" parts={PARTS} today={TODAY} />
        <IssueBuildLine lesson={LESSON} />
      </>,
    );
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/me/build/open']);
    expect(container.innerHTML).toBe(renderToStaticMarkup(TODAY));
  });

  it("draw the course's line for a person Build is open to, reading the course's doors once", async () => {
    const fetch = routes(true, doorsMany);
    vi.stubGlobal('fetch', fetch);
    await draw(
      <>
        <CourseBuildLine course="algorithms" />
        <GoFurtherRows course="algorithms" parts={PARTS} today={TODAY} />
      </>,
    );
    expect(container.querySelector('[data-course-build-line]')?.textContent).toBe(
      'Build it yourself: a key-value database, an interpreter, a search engine and 2 more',
    );
    expect(container.querySelector('a[href="/build/projects"]')?.textContent).toBe('2 more');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/me/build/open',
      '/api/me/build/doors?course=algorithms',
    ]);
  });

  it("mark the person's place on the course's line", async () => {
    vi.stubGlobal('fetch', routes(true, doorsPlaces));
    await draw(<CourseBuildLine course="algorithms" />);
    const line = container.querySelector('[data-course-build-line]');
    expect(line?.textContent).toBe('Build it yourself: a key-value database , an interpreter (step 4 of 18)');
    expect(line?.querySelector('svg[aria-label="built"]')).not.toBeNull();
  });

  it('draw "Go further" as rows with marks: learn, build, fix, and the job row only in a free place', async () => {
    vi.stubGlobal('fetch', routes(true, doorsInProgress));
    await draw(<GoFurtherRows course="algorithms" parts={PARTS} today={TODAY} />);
    expect(rows()).toEqual([
      ['lessons', 'Databases and SQLNext course · 64 lessons'],
      ['project', 'Your key-value databaseYour build · step 9 of 14'],
      ['issue', 'Fix a real issueReal issues · 2 open'],
    ]);
    expect(container.querySelector('[data-door-mark="project"]')).not.toBeNull();

    await act(async () => root.unmount());
    root = createRoot(container);
    await draw(<GoFurtherRows course="algorithms" parts={{ next: null, issues: PARTS.issues }} today={TODAY} />);
    expect(rows().map(([mark]) => mark)).toEqual(['project', 'issue', 'job']);
    expect(container.querySelector('[data-further-row="job"] a')?.getAttribute('target')).toBe('_blank');
  });

  it('never leave "Go further" empty: the job row alone when nothing else is behind it', async () => {
    vi.stubGlobal('fetch', routes(true, { projects: [], builds: [] }));
    await draw(<GoFurtherRows course="algorithms" parts={{ next: null, issues: null }} today={TODAY} />);
    expect(rows()).toEqual([['job', 'Looking for a job? ↗Roles that match what you know']]);
  });

  it("draw the issue's line, last on the page, read by the lesson", async () => {
    const fetch = routes(true, doorsOne);
    vi.stubGlobal('fetch', fetch);
    await draw(<IssueBuildLine lesson={LESSON} />);
    expect(container.textContent).toBe(
      'New to this? Learn “Find duplicates in one pass with a set”, or build a key-value database with your agent first.',
    );
    expect(fetch.mock.calls.map(([url]) => url)).toContain('/api/me/build/doors?lesson=find-duplicates');

    await act(async () => root.unmount());
    root = createRoot(container);
    await draw(<IssueBuildLine lesson={{ ...LESSON, learned: true }} />);
    expect(container.textContent).toBe(
      'Want more practice first? Build a key-value database with your agent. It uses the same idea.',
    );
  });
});
