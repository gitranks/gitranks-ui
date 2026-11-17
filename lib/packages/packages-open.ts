import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

/** Where the browser asks whether package pages are open to this viewer. */
export const PACKAGES_OPEN_PATH = '/api/me/packages/open';

/** The key a signed-out viewer's answer is kept under: GitHub logins cannot hold `:`, so no login is this. */
const SIGNED_OUT = ':signed-out';

const packagesOpen = openInBrowserOf(PACKAGES_OPEN_PATH);

/**
 * Whether package pages are open to this viewer, signed in or not, for a client component: pages are cached for
 * everyone, so it is asked in the browser once the page is up, once per login (or once signed out) per page load. False
 * until the answer comes and on any failure; known at once after a first answer, so moving between pages does not flash
 * anything in.
 */
export function usePackagesOpen(): boolean {
  const { data: session } = useSession();
  const key = (session && !session.error ? session.user?.githubLogin : null) || SIGNED_OUT;
  const [open, setOpen] = useState(() => packagesOpen.known(key) === true);

  useEffect(() => {
    let live = true;
    packagesOpen.ask(key).then((answer) => {
      if (live) setOpen(answer);
    });
    return () => {
      live = false;
    };
  }, [key]);

  return open;
}

/** Forgets the answers (tests). */
export const resetPackagesOpen = () => packagesOpen.reset();
