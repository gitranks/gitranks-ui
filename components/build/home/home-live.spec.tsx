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

const { HomeLive, readHomeSide } = await import('./home-live');
const { sideBuilder, sideNoBuild } = await import('@/lib/build/__fixtures__/home');
const { buildProjectsFew } = await import('@/lib/build/__fixtures__/projects');

/** Answers the person's routes as given; records what was asked. */
function serve(answers: Record<string, unknown>) {
  const asked: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => {
      asked.push(path);
      const key = Object.keys(answers).find((prefix) => path.startsWith(prefix));
      return key ? new Response(JSON.stringify(answers[key])) : new Response('{}', { status: 500 });
    }),
  );
  return asked;
}

describe("Build's home in the browser", () => {
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

  const kind = () => container.querySelector('main')?.getAttribute('data-build-home');

  it('asks nothing for a visitor and shows the landing at once', async () => {
    hint.present = false;
    const asked = serve({});
    await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
    expect(asked).toEqual([]);
    expect(kind()).toBe('landing');
    expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
  });

  it("becomes a builder's home once their side is read", async () => {
    const asked = serve({
      '/api/me/build/home': { home: sideBuilder.home },
      '/api/me/build/projects': { builds: sideBuilder.builds },
    });
    await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
    expect(asked.sort()).toEqual(['/api/me/build/home', '/api/me/build/projects']);
    expect(kind()).toBe('home');
    expect(container.textContent).toContain('last step');
    expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
  });

  it('reads whether an agent connected only for a person with no build', async () => {
    const asked = serve({
      '/api/me/build/home': { home: sideNoBuild.home },
      '/api/me/build/projects': { builds: [] },
      '/api/me/build/start': { start: { agentConnected: true, build: null } },
    });
    await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
    expect(asked).toContain('/api/me/build/start');
    expect(kind()).toBe('landing');
    expect(container.querySelector('[data-landing-start]')?.getAttribute('data-landing-start')).toBe('pick');
  });

  it('keeps the landing when Build is not open to the person or a read fails', async () => {
    serve({ '/api/me/build/home': { home: null } });
    await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
    expect(kind()).toBe('landing');
    expect(container.querySelector('[data-landing-start]')?.getAttribute('data-landing-start')).toBe('connect');
  });

  it('reads a side as null where a route failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await readHomeSide()).toEqual({ home: null, builds: null, agentConnected: null });
  });
});
