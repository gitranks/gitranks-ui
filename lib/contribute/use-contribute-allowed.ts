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

/**
 * Whether GitRanks Contribute is open to the signed-in user `login`: false for nobody, until the answer comes, and on
 * any failure. Shared by the header's menu item and the home page's section, through one cached answer.
 */
export function useContributeAllowed(login: string | null | undefined): boolean {
  const [allowed, setAllowed] = useState(false);

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
    let live = true;
    fetch('/api/me/contribute')
      .then((res) => (res.ok ? (res.json() as Promise<{ previewAllowed?: boolean }>) : null))
      .then((data) => {
        const value = data?.previewAllowed === true;
        writeCache(login, value);
        if (live) setAllowed(value);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [login]);

  return allowed;
}
