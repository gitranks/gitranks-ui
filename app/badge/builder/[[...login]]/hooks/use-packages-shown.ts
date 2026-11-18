'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { PACKAGES_OPEN_PATH } from '@/lib/packages/packages-open';
import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

const gate = openInBrowserOf(PACKAGES_OPEN_PATH);

/** The key a signed-out viewer's answer is kept under, as `usePackagesOpen` keeps it, so both share one answer. */
const SIGNED_OUT = ':signed-out';

/**
 * Whether packages are shown to this viewer: true once the browser knows they are, false until then and on any
 * failure. With `ask` the answer is asked for (a builder link that names a package); without it nothing is asked, and
 * an answer the page already has (the header asks for its menu) is read at each render. The builder is drawn as it
 * always was meanwhile: a link that names a package then switches to it once the answer is in.
 */
export function usePackagesShown(ask: boolean): boolean {
  const { data: session, status } = useSession();
  const key =
    status === 'loading' ? null : (session && !session.error ? session.user?.githubLogin : null) || SIGNED_OUT;
  const [answer, setAnswer] = useState<{ key: string; open: boolean } | null>(null);

  useEffect(() => {
    if (!key || !ask) return;
    let live = true;
    gate.ask(key).then((open) => {
      if (live) setAnswer({ key, open });
    });
    return () => {
      live = false;
    };
  }, [key, ask]);

  if (!key) return false;
  return (answer?.key === key ? answer.open : gate.known(key)) === true;
}
