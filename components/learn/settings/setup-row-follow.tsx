'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LEARN_SETUP_SETTLED_EVENT } from '@/lib/learn/learn-bar';

/**
 * Reads the page again when Learn's bar finds our guess in (`LEARN_SETUP_SETTLED_EVENT`), so a row that said none yet,
 * or that we are reading the profile, shows the guess without a reload. Draws nothing.
 */
export function SetupRowFollow() {
  const router = useRouter();
  useEffect(() => {
    const settled = () => router.refresh();
    window.addEventListener(LEARN_SETUP_SETTLED_EVENT, settled);
    return () => window.removeEventListener(LEARN_SETUP_SETTLED_EVENT, settled);
  }, [router]);
  return null;
}
