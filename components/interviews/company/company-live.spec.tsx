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
const hint = vi.hoisted(() => ({ present: false }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(async () => undefined) }));

const { CompanyLive } = await import('./company-live');
const { northwindPage, tallgrassPage } = await import('@/lib/interviews/__fixtures__/companies');
const { myHomeNone, myHomeTwo } = await import('@/lib/interviews/__fixtures__/mine');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

const answer = (home: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ home }), { status }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  hint.present = false;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const draw = (page = northwindPage) => act(async () => root.render(<CompanyLive page={page} />));
const held = () => host.querySelector('[data-company-held]');

describe("a company's page as it lives in the browser", () => {
  it("asks nothing for a visitor and draws the visitor's page", async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-company-box]')).toBeNull();
    expect(held()).toBeNull();
  });

  it("reads the person's plans in progress and draws the box and the mark for their plan here", async () => {
    hint.present = true;
    answer(myHomeTwo);
    await draw();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/me/interviews/home');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
    expect(host.querySelector('[data-company-box]')?.getAttribute('data-company-box')).toBe('senior-software-engineer');
    expect(host.querySelectorAll('[data-your-plan]')).toHaveLength(1);
    expect(held()).toBeNull();
  });

  it("draws no box at a company where the person's plans are not", async () => {
    hint.present = true;
    answer({ plans: myHomeTwo.plans.slice(0, 1) });
    await draw(tallgrassPage);
    expect(host.querySelector('[data-company-box]')).toBeNull();
    expect(host.querySelector('[data-your-plan]')).toBeNull();
  });

  it("draws the visitor's page for a person with no plan, when Interviews is closed to them, and on a failure", async () => {
    hint.present = true;
    for (const reply of [
      () => answer(myHomeNone),
      () => answer(null),
      () => answer(null, 500),
      () => fetchMock.mockRejectedValue(new Error('down')),
    ]) {
      reply();
      await draw();
      expect(host.querySelector('[data-company-box]')).toBeNull();
      expect(held()).toBeNull();
      await act(async () => root.unmount());
      root = createRoot(host);
    }
  });

  it('keeps the sections hidden while it reads, and shows them after the time limit', async () => {
    vi.useFakeTimers();
    hint.present = true;
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await draw();
    expect(held()?.getAttribute('aria-busy')).toBe('true');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(held()).toBeNull();
    expect(host.querySelector('[data-company-box]')).toBeNull();
  });
});
