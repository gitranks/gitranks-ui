'use client';

import type { Session } from 'next-auth';
import { __NEXTAUTH, SessionContext } from 'next-auth/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { hasSessionHint } from '@/lib/session-hint';

/** What one read of the session gives: a proper answer (a person, or none), or no answer at all. */
export type SessionRead = { ok: true; session: Session | null } | { ok: false };

/**
 * Reads the session from Auth.js. Only a 2xx answer counts: a person when it names one, else nobody. A 429 (the site
 * rate-limits bursts), any other failed status, a body that is not JSON or a network error is no answer.
 */
export async function readSession(): Promise<SessionRead> {
  try {
    const res = await fetch(`${__NEXTAUTH.basePath}/session`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as Session | null;
    return { ok: true, session: body?.user ? body : null };
  } catch {
    return { ok: false };
  }
}

/** How long to wait before asking again after a read with no answer: doubles each time, up to five minutes. */
export const RETRY_FIRST_MS = 5_000;
export const RETRY_MAX_MS = 300_000;

/** The channel Auth.js uses to tell other tabs that the session may have changed (a sign-in or a sign-out there). */
const CHANNEL = 'next-auth';

type Known = { data: Session | null | undefined; status: 'loading' | 'authenticated' | 'unauthenticated' };

const openChannel = () => (typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL));

/**
 * Gives `useSession` the person, as Auth.js's own provider would, with one difference: only a proper answer changes
 * who is signed in. A read that fails (a 429, a 5xx, the network) keeps the last known state, and is asked again later
 * (with a growing wait, and whenever the tab is shown again); before any proper answer the state stays "loading", so
 * a signed-in person is never drawn as signed out. A proper answer with no person is a sign-out, and shows as one.
 *
 * Without the session hint the browser holds no session: the page asks nothing and the person is signed out. A sign-in
 * or a sign-out in another tab reaches this one through Auth.js's cross-tab channel, and a shown tab asks again while
 * someone is signed in, as Auth.js does.
 */
export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [known, setKnown] = useState<Known>({ data: undefined, status: 'loading' });
  const signedIn = useRef(false);
  const failed = useRef(false);
  const retry = useRef<{ timer?: ReturnType<typeof setTimeout>; wait: number }>({ wait: RETRY_FIRST_MS });
  const reading = useRef<Promise<Session | null | undefined> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  /** Asks once (a read already on its way is shared); `tell` lets other tabs know, unless they told this one. */
  const read = useCallback((tell: boolean): Promise<Session | null | undefined> => {
    if (reading.current) return reading.current;
    clearTimeout(retry.current.timer);
    reading.current = readSession().then((answer) => {
      reading.current = null;
      if (!answer.ok) {
        failed.current = true;
        const wait = retry.current.wait;
        retry.current = { wait: Math.min(wait * 2, RETRY_MAX_MS), timer: setTimeout(() => void read(false), wait) };
        return undefined;
      }
      failed.current = false;
      retry.current = { wait: RETRY_FIRST_MS };
      signedIn.current = !!answer.session;
      // Auth.js's own helpers (`getSession` callers, `signIn` without a redirect) read what is known from here.
      __NEXTAUTH._session = answer.session;
      setKnown({ data: answer.session, status: answer.session ? 'authenticated' : 'unauthenticated' });
      if (tell) channel.current?.postMessage({ event: 'session', data: { trigger: 'getSession' } });
      return answer.session;
    });
    return reading.current;
  }, []);

  useEffect(() => {
    channel.current = openChannel();
    const heard = (event: MessageEvent) => {
      if ((event.data as { event?: string } | null)?.event === 'session') void read(false);
    };
    channel.current?.addEventListener('message', heard);
    const shown = () => {
      if (document.visibilityState === 'visible' && (signedIn.current || failed.current)) void read(false);
    };
    document.addEventListener('visibilitychange', shown);
    __NEXTAUTH._getSession = () => read(false);

    if (hasSessionHint(document.cookie)) {
      void read(true);
    } else {
      __NEXTAUTH._session = null;
      setKnown({ data: null, status: 'unauthenticated' });
    }

    return () => {
      clearTimeout(retry.current.timer);
      channel.current?.removeEventListener('message', heard);
      channel.current?.close();
      channel.current = null;
      document.removeEventListener('visibilitychange', shown);
      __NEXTAUTH._getSession = () => {};
    };
  }, [read]);

  const value = useMemo(
    () => ({
      data: known.data,
      status: known.status,
      // Reads the session again; changing it from the browser is not used here.
      update: async () => (await read(true)) ?? null,
    }),
    [known, read],
  );

  // Auth.js types the context loosely; its value is what `useSession` returns.
  return <SessionContext.Provider value={value as never}>{children}</SessionContext.Provider>;
}
