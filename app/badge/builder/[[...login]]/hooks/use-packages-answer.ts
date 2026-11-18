'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { PACKAGES_OPEN_PATH } from '@/lib/packages/packages-open';
import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

const gate = openInBrowserOf(PACKAGES_OPEN_PATH);

/** The key a signed-out viewer's answer is kept under, as `usePackagesOpen` keeps it, so both share one answer. */
const SIGNED_OUT = ':signed-out';

/**
 * Whether packages are shown to this viewer: `undefined` until the browser knows (while the session loads, and until
 * the answer comes), then the answer, false on any failure. The builder waits on it only for a link that names a
 * package; anything else is drawn as today meanwhile.
 */
export function usePackagesAnswer(): boolean | undefined {
  const { data: session, status } = useSession();
  const key =
    status === 'loading' ? null : (session && !session.error ? session.user?.githubLogin : null) || SIGNED_OUT;
  const [answer, setAnswer] = useState<{ key: string; open: boolean } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    gate.ask(key).then((open) => {
      if (live) setAnswer({ key, open });
    });
    return () => {
      live = false;
    };
  }, [key]);

  if (!key) return undefined;
  return answer?.key === key ? answer.open : gate.known(key);
}
