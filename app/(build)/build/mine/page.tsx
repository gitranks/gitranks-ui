import type { Metadata } from 'next';

import { BuildMineLive } from '@/components/build/mine/mine-live';

/** My builds: only the person's own, so search engines never keep it. */
export const metadata: Metadata = { title: 'My builds', robots: { index: false, follow: false } };

/**
 * My builds: the tests that wait, the builds in progress and the built projects of the signed-in person. The page
 * holds nothing personal and reads nothing on the server: the builds are read in the browser, and a visitor is asked
 * to sign in there.
 */
export default function BuildMinePage() {
  return <BuildMineLive />;
}
