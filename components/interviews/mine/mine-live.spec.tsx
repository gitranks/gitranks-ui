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
const { hint, signIn, session } = vi.hoisted(() => ({
  hint: { present: true },
  signIn: vi.fn(async () => undefined),
  session: {
    current: { data: { user: { githubLogin: 'octocat' } } as unknown, status: 'authenticated' },
  },
}));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('next-auth/react', () => ({ signIn, useSession: () => session.current }));

const { InterviewsMineLive } = await import('./mine-live');
const { mineFinishedOnly, mineFull } = await import('@/lib/interviews/__fixtures__/mine');
const { mineMany, mineNone, mineOne } = await import('@/lib/interviews/__fixtures__/mine-page');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** The route answers each read in turn from `answers`: a list of plans, or 'down' for a failure. */
function route(...answers: unknown[]) {
  let read = 0;
  fetchMock.mockImplementation(async () => {
    const answer = answers[Math.min(read++, answers.length - 1)];
    return answer === 'down' ? json({}, 502) : json({ mine: answer });
  });
}

async function draw() {
  await act(async () => {
    root.render(<InterviewsMineLive />);
  });
  await act(async () => {});
}

const text = () => host.textContent ?? '';
const parts = () =>
  [...host.querySelectorAll('[data-interviews-mine-part]')].map(
    (part) => part.id || part.getAttribute('data-interviews-mine-part'),
  );
const rows = (kind?: string) => [
  ...host.querySelectorAll<HTMLElement>(`[data-interviews-mine-row${kind ? `="${kind}"` : ''}]`),
];

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  signIn.mockClear();
  hint.present = true;
  session.current = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('My interviews', () => {
  it('says the plans are not public, in every state', async () => {
    route(mineFull);
    await draw();
    expect(host.querySelector('h1')?.textContent).toBe('My interviews');
    expect(text()).toContain('Your interview plans are not publicly visible.');
  });

  it('lists the plans in progress, then the finished ones, then the way to the companies', async () => {
    route(mineFull);
    await draw();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/interviews/mine', { cache: 'no-store' });
    expect(parts()).toEqual(['interviews-mine-progress', 'interviews-mine-finished']);
    expect(text()).toContain('The plan you worked on last comes first.');
    expect(rows('in_progress')).toHaveLength(2);
    expect(rows('finished')).toHaveLength(1);
    const link = [...host.querySelectorAll('a')].at(-1);
    expect(link?.textContent).toBe('See all companies');
    expect(link?.getAttribute('href')).toBe('/interviews');
  });

  it('draws a row as one link: the logo, the name, the line, the marks, the arrow, and no button', async () => {
    route(mineFull);
    await draw();
    const [row] = rows('in_progress');
    const links = row.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/interviews/northwind/senior-software-engineer');
    expect(row.querySelector('button')).toBeNull();
    expect(row.querySelector('[data-company-logo="northwind"]')).not.toBeNull();
    expect(row.textContent).toContain('Northwind · Senior software engineer');
    expect(row.textContent).toContain('Round 3 of 5 · Next: Graphs, 11 lessons');
    // The marks are drawn twice, beside the line and under it on a phone; one of them shows at each width.
    const marks = row.querySelectorAll('[data-interviews-marks]');
    expect(marks).toHaveLength(2);
    expect([...marks[0].querySelectorAll('[data-mark]')].map((mark) => mark.getAttribute('data-mark'))).toEqual([
      'done',
      'done',
      'current',
      'to_come',
      'to_come',
    ]);
    expect(marks[0].getAttribute('aria-hidden')).toBe('true');
    expect(marks[0].parentElement?.className).toContain('sm:hidden');
    expect(marks[1].parentElement?.className).toContain('max-sm:hidden');
  });

  it('draws a finished plan with its day and "Done"', async () => {
    route(mineFull);
    await draw();
    const [row] = rows('finished');
    expect(row.textContent).toContain('Northwind · Mid level software engineer');
    expect(row.textContent).toMatch(/All 5 rounds done · finished \d+ (Oct|Nov)/);
    expect(row.querySelectorAll('[data-interviews-done]')).toHaveLength(2);
    expect(row.querySelector('[data-interviews-marks]')).toBeNull();
  });

  it('with one plan, has no "Finished" part', async () => {
    route(mineOne);
    await draw();
    expect(parts()).toEqual(['interviews-mine-progress']);
    expect(rows()).toHaveLength(1);
  });

  it('with only finished plans, has no "In progress" part', async () => {
    route(mineFinishedOnly);
    await draw();
    expect(parts()).toEqual(['interviews-mine-finished']);
    expect(text()).not.toContain('In progress');
    expect(text()).toContain('See all companies');
  });

  it('with no plan, says so in one line with the way to the companies', async () => {
    route(mineNone);
    await draw();
    expect(parts()).toEqual([]);
    const none = host.querySelector('[data-interviews-mine="none"]');
    expect(none?.textContent).toContain('You have no interview plan yet.');
    expect(none?.querySelector('a')?.textContent).toBe('See the companies');
    expect(none?.querySelector('a')?.getAttribute('href')).toBe('/interviews');
  });

  it('with many plans and a long name, lists them all in order with nothing to page through', async () => {
    route(mineMany);
    await draw();
    expect(rows('in_progress').map((row) => row.querySelector('a')?.getAttribute('href'))).toEqual([
      '/interviews/northwind/mid-senior-site-reliability-engineer',
      '/interviews/northwind/senior-software-engineer',
      '/interviews/northwind/staff-software-engineer',
    ]);
    expect(rows('in_progress')[0].textContent).toContain('mid level and senior, all teams and all offices');
    expect(rows('in_progress')[2].textContent).toContain('Round 2 of 5 is done · Next: Graphs, 1 lesson');
    expect(rows('finished')).toHaveLength(2);
    expect(host.querySelector('nav')).toBeNull();
  });

  it('asks a visitor to sign in, and comes back here', async () => {
    hint.present = false;
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-interviews-mine="visitor"]')?.textContent).toContain(
      'Sign in to see your interview plans',
    );
    const button = host.querySelector('button');
    expect(button?.textContent).toBe('Sign in with GitHub');
    await act(async () => button?.click());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/interviews/mine' });
  });

  it('asks to sign in again when the session ended', async () => {
    session.current = { data: null, status: 'unauthenticated' };
    route('down');
    await draw();
    expect(host.querySelector('[data-interviews-mine="ended"]')?.textContent).toContain(
      'Sign in again to see your interview plans',
    );
  });

  it('says a failed read in place, and reads again on "Try again"', async () => {
    route('down', mineOne);
    await draw();
    expect(host.querySelector('[data-interviews-mine="failed"]')?.textContent).toContain(
      'Your interview plans did not load',
    );
    await act(async () => host.querySelector('button')?.click());
    await act(async () => {});
    expect(rows()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the pending place while the plans are on their way', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await draw();
    expect(host.querySelector('[data-interviews-mine="pending"]')).not.toBeNull();
  });
});
