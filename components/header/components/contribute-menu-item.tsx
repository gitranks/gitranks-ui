'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { mainMenuItemClass } from './menu-styles';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'contribute-preview';
/** The answer is reused for a while, so the header does not ask on every page view. */
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
    // Storage can be off; the header asks again next time.
  }
};

/**
 * "Contribute", shown only to someone GitRanks Contribute is open to: during the preview a signed-in user the API lets
 * in, once launched everyone (a visitor without a session is cached under no login).
 */
export function ContributeMenuItem({ active }: Readonly<{ active?: boolean }>) {
  const { data: session, status } = useSession();
  const login = session?.user?.githubLogin ?? (status === 'unauthenticated' ? '' : undefined);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (login === undefined) {
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

  if (!allowed) return null;

  return (
    <NavigationMenuItem>
      <NavigationMenuLink className={cn(mainMenuItemClass, 'gap-1.5')} active={active} asChild>
        <Link href="/contribute" prefetch={false}>
          Contribute
          <span className="rounded-full bg-violet-100 px-1.5 py-px text-[11px] font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            new
          </span>
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
