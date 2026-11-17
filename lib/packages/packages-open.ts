import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

/** Where the browser asks whether package pages are open to the signed-in viewer. */
export const PACKAGES_OPEN_PATH = '/api/me/packages/open';

const packagesOpen = openInBrowserOf(PACKAGES_OPEN_PATH);

/**
 * Whether package pages are open to the signed-in viewer, for a client component: pages are cached for everyone, so it
 * is asked in the browser once the page is up, once per login per page load. False until the answer comes, signed out,
 * and on any failure; known at once after a first answer, so moving between pages does not flash anything in.
 */
export function usePackagesOpen(): boolean {
  const { data: session } = useSession();
  const login = session && !session.error ? (session.user?.githubLogin ?? null) : null;
  const [open, setOpen] = useState(() => packagesOpen.known(login) === true);

  useEffect(() => {
    let live = true;
    packagesOpen.ask(login).then((answer) => {
      if (live) setOpen(answer);
    });
    return () => {
      live = false;
    };
  }, [login]);

  return open && login !== null;
}

/** Forgets the answers (tests). */
export const resetPackagesOpen = () => packagesOpen.reset();
