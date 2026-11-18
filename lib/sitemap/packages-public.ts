import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { packagesPublic } from '@/lib/packages/packages-gate';

/**
 * Whether package pages are open to everyone, for the sitemaps and llms.txt: never per visitor, so a list of preview
 * viewers lists nothing. Asked per request and never while the site is built, where the answer would be fixed as it was
 * then: during a build this never resolves, and the route is left to render per request.
 */
export async function packagesPublicNow(): Promise<boolean> {
  await connection();
  return packagesPublic();
}

/** A package sitemap answers 404 until package pages are open to everyone. */
export async function notFoundUnlessPackagesPublic(): Promise<void> {
  if (!(await packagesPublicNow())) {
    notFound();
  }
}
