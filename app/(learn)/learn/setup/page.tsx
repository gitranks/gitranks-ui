import type { Metadata } from 'next';
import { connection } from 'next/server';

import { SetupLive } from '@/components/learn/setup/setup-live';
import { LEARN_SETUP_METADATA } from '@/lib/learn/seo/setup';
import { loadSetupStarts } from '@/lib/learn/setup.data';

/**
 * Set up Learn (page 5): only the person's own, so the page holds no personal data and is never indexed; the setup is
 * read in the browser. Where each language starts is the same for everyone, from the cached courses: the save sends
 * the person there. Drawn for each request, never kept: a page built ahead, with the courses not read then, would send
 * every save to all courses. The page asks a visitor to sign in itself and reads nothing personal on the server.
 */
export const instant = false;

export const metadata: Metadata = LEARN_SETUP_METADATA;

export default async function SetupPage() {
  await connection();
  return <SetupLive starts={await loadSetupStarts()} />;
}
