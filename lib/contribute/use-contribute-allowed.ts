'use client';

import { useEffect, useState } from 'react';

const CACHE_KEY = 'contribute-preview';
/** The answer is reused for a while, so a page does not ask on every view. */
const CACHE_MS = 10 * 60 * 1000;

type Cached = { login: string; allowed: boolean; at: number };

const readCache = (login: string): boolean | null => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as Cached | null;
    return cached?.login === login && Date.now() - cached.at < CACHE_MS ? cached.allowed : null;
  } catch {
    return null;
  }
};

const writeCache = (login: string, allowed: boolean) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ login, allowed, at: Date.now() } satisfies Cached));
  } catch {
    // Storage can be off; the page asks again next time.
  }
};

/** The question under way, per login, so the header and a page asking at once send one request. */
const asking = new Map<string, Promise<boolean>>();

const ask = (login: string): Promise<boolean> => {
  const pending = asking.get(login);
  if (pending) return pending;
  const answer = fetch('/api/me/contribute')
    .then((res) => (res.ok ? (res.json() as Promise<{ previewAllowed?: boolean }>) : null))
    .then((data) => {
      const value = data?.previewAllowed === true;
      writeCache(login, value);
      return value;
    })
    .catch(() => false)
    .finally(() => asking.delete(login));
  asking.set(login, answer);
  return answer;
};

/**
 * Whether GitRanks Contribute is open to the signed-in user `login`: null while the answer is on its way, false for
 * nobody and on any failure. Shared by the header's menu item and the home page's section, through one cached answer.
 */
export function useContributeAllowed(login: string | null | undefined): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(login ? null : false);

  useEffect(() => {
    if (!login) {
      setAllowed(false);
      return;
    }
    const cached = readCache(login);
    if (cached !== null) {
      setAllowed(cached);
      return;
    }
    setAllowed(null);
    let live = true;
    ask(login).then((value) => {
      if (live) setAllowed(value);
    });
    return () => {
      live = false;
    };
  }, [login]);

  return allowed;
}
