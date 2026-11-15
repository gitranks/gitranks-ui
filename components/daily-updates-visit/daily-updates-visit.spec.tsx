// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DailyUpdatesVisit, WELCOME_BACK_TOAST } from './daily-updates-visit';
import { stampVisit, visitDayOf, visitedToday } from './visit-stamp';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, toast } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  toast: { success: vi.fn() },
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
vi.mock('sonner', () => ({ toast }));

const NOW = Date.parse('2026-11-15T12:00:00Z');
const SIGNED_IN = { data: { user: { githubLogin: 'Octo-Dev' } }, status: 'authenticated' };
const ON = { state: 'on', until: '2026-11-22T12:00:00.000Z', restarted: false, retry: false };

const fetchMock = vi.fn();
const answerWith = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

/** A storage that refuses every access, as in a private mode. */
const refusing = () =>
  ({
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('SecurityError');
    },
  }) as unknown as Storage;

describe('DailyUpdatesVisit', () => {
  let container: HTMLDivElement;
  let root: Root;

  const visit = async () => {
    root = createRoot(container);
    await act(async () =>
      root.render(
        <StrictMode>
          <DailyUpdatesVisit />
        </StrictMode>,
      ),
    );
    await act(async () => {});
    act(() => root.unmount());
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    toast.success.mockReset();
    window.localStorage.clear();
    session.current = SIGNED_IN;
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends nothing without a session, or while it loads', async () => {
    session.current = { data: null, status: 'unauthenticated' };
    await visit();
    session.current = { data: null, status: 'loading' };
    await visit();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts one visit a day per browser', async () => {
    answerWith(ON);
    await visit();
    await visit();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/daily-updates/visit', {
      method: 'POST',
      cache: 'no-store',
    });
    expect(visitedToday('octo-dev', NOW)).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();

    vi.setSystemTime(NOW + 24 * 3_600_000);
    answerWith(ON);
    await visit();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps no day when the answer asks for a retry, or the call fails, so a later page asks again', async () => {
    answerWith({ ...ON, retry: true });
    await visit();
    expect(visitedToday('octo-dev', NOW)).toBe(false);

    answerWith({ message: 'Bad gateway' }, 502);
    await visit();
    expect(visitedToday('octo-dev', NOW)).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await visit();
    expect(visitedToday('octo-dev', NOW)).toBe(false);

    answerWith(ON);
    await visit();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(visitedToday('octo-dev', NOW)).toBe(true);
  });

  it('says "Welcome back" when the visit started daily updates again, until it is closed', async () => {
    answerWith({ ...ON, restarted: true });
    await visit();

    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Welcome back', {
      ...WELCOME_BACK_TOAST,
      description:
        'Daily updates stopped after 7 days without a visit. They are on again, and your profile is refreshing now.',
    });
    expect(WELCOME_BACK_TOAST).toMatchObject({ duration: Infinity, closeButton: true });
  });

  it('still counts the visit, with no stamp and no error, when storage refuses access', async () => {
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    answerWith({ ...ON, restarted: true });

    await expect(visit()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
    storage.mockRestore();
  });

  it('keeps one day per login', async () => {
    answerWith(ON);
    await visit();

    session.current = { data: { user: { githubLogin: 'someone-else' } }, status: 'authenticated' };
    answerWith(ON);
    await visit();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('the visit stamp', () => {
  it('is the UTC day, for the login in any letter case', () => {
    const items = new Map<string, string>();
    const storage = () =>
      ({
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => items.set(key, value),
      }) as unknown as Storage;

    stampVisit('Octo-Dev', Date.parse('2026-11-15T23:59:00Z'), storage);

    expect(items).toEqual(new Map([['daily-updates-visit:octo-dev', '2026-11-15']]));
    expect(visitedToday('OCTO-DEV', Date.parse('2026-11-15T00:01:00Z'), storage)).toBe(true);
    expect(visitedToday('octo-dev', Date.parse('2026-11-16T00:00:00Z'), storage)).toBe(false);
    expect(visitDayOf(Date.parse('2026-11-16T00:00:00Z'))).toBe('2026-11-16');
  });

  it('is no stamp and no error when storage refuses access', () => {
    expect(() => stampVisit('octo-dev', NOW, refusing)).not.toThrow();
    expect(visitedToday('octo-dev', NOW, refusing)).toBe(false);
  });
});
