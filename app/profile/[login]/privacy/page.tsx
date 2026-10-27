'use cache';

import type { Metadata } from 'next';

import { PrivacyPanel } from './components/privacy-panel';

export const metadata: Metadata = { title: 'Privacy', robots: { index: false, follow: false } };

/**
 * The Privacy tab: only the signed-in owner of the profile sees it in the tab bar, and only they can act on it (the
 * panel reads the session; the server checks it again). Nothing here reads the profile, so the tab still answers
 * after the data is gone, and the page is the same for everyone: cached like its sibling tabs.
 */
export default async function ProfilePrivacy({ params }: PageProps<'/profile/[login]/privacy'>) {
  const { login } = await params;
  return <PrivacyPanel login={login} />;
}
