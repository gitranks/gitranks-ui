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
// The zone the person's days are counted in, as the API's route answers it; and the note that sends the browser's zone.
const zoneRead = vi.hoisted(() => ({ value: 'UTC' as string | undefined }));
vi.mock('@/lib/build/zone-live', () => ({ readBuildZone: async () => zoneRead.value }));
vi.mock('@/components/workspace/time-zone-note', () => ({ TimeZoneNote: () => <span data-time-zone-note="" /> }));

const { HomeLive, readHomeSide } = await import('./home-live');
const { AboutLive } = await import('./about-live');
const { HOME_READ_WAIT_MS } = await import('@/lib/build/home');
const { sideBuilder, sideNoBuild, sideTestWaits } = await import('@/lib/build/__fixtures__/home');
const { endTestOpen } = await import('@/lib/build/__fixtures__/test');
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
    // Once the side is read, the browser's zone is sent, as on Learn's pages.
    expect(container.querySelector('[data-time-zone-note]')).not.toBeNull();
  });

  it('reads the test that waits first, so the box can go on with a run left in the middle', async () => {
    const asked = serve({
      '/api/me/build/home': { home: sideTestWaits.home },
      '/api/me/build/projects': { builds: sideTestWaits.builds },
      '/api/me/build/test': { test: endTestOpen },
    });
    await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
    expect(asked).toContain('/api/me/build/test?project=mcp-server&kind=end&language=typescript');
    expect(container.querySelector('[data-home-box="end-going"]')).not.toBeNull();
  });

  it('offers the test as for a first try when its read fails', async () => {
    serve({
      '/api/me/build/home': { home: sideTestWaits.home },
      '/api/me/build/projects': { builds: sideTestWaits.builds },
    });
    await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
    expect(container.querySelector('[data-home-box="test"]')).not.toBeNull();
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
    expect(container.querySelector('[data-time-zone-note]')).toBeNull();
    expect(container.querySelector('[data-landing-start]')?.getAttribute('data-landing-start')).toBe('connect');
  });

  it('shows the landing when the side is late, then the home in place once it comes', async () => {
    vi.useFakeTimers();
    try {
      let answer: (value: Response) => void = () => {};
      vi.stubGlobal(
        'fetch',
        vi.fn((path: string) =>
          path.startsWith('/api/me/build/home')
            ? new Promise<Response>((resolve) => {
                answer = resolve;
              })
            : Promise.resolve(new Response(JSON.stringify({ builds: sideBuilder.builds }))),
        ),
      );
      await act(async () => root.render(<HomeLive projects={buildProjectsFew} />));
      expect(container.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
      await act(async () => vi.advanceTimersByTime(HOME_READ_WAIT_MS));
      expect(container.querySelector('main')?.getAttribute('aria-busy')).toBeNull();
      expect(kind()).toBe('landing');
      await act(async () => answer(new Response(JSON.stringify({ home: sideBuilder.home }))));
      expect(kind()).toBe('home');
    } finally {
      vi.useRealTimers();
    }
  });

  it('turns the main button of "How Build works" once the agent is known, and asks nothing for a visitor', async () => {
    const asked = serve({ '/api/me/build/start': { start: { agentConnected: true, build: null } } });
    await act(async () => root.render(<AboutLive projects={buildProjectsFew} />));
    expect(asked).toEqual(['/api/me/build/start']);
    expect(container.querySelector('[data-landing-start]')?.getAttribute('data-landing-start')).toBe('pick');
    expect(container.querySelector('[data-build-foot]')).toBeNull();
    await act(async () => root.unmount());
    root = createRoot(container);
    hint.present = false;
    const none = serve({});
    await act(async () => root.render(<AboutLive projects={buildProjectsFew} />));
    expect(none).toEqual([]);
    expect(container.querySelector('[data-landing-start]')?.getAttribute('data-landing-start')).toBe('connect');
  });

  it('reads a side as null where a route failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await readHomeSide()).toEqual({ home: null, builds: null, agentConnected: null, zone: 'UTC' });
  });
});
