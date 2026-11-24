import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FixRemovedView } from '@/components/learn/walkthrough/walkthrough-parts';
import { learnFixRemovedMetadata } from '@/lib/learn/seo/walkthrough';
import { fixRefOf } from '@/lib/learn/walkthrough';
import { loadFixAddress } from '@/lib/learn/walkthrough.data';

/**
 * `/learn/fixes/_removed/<owner>/<repo>/<number>`, where the proxy shows a fix whose pages were removed, with a 410
 * (`lib/learn/fix-gate.ts`). `_removed` is no GitHub owner's shape, so no fix is ever under it. Read from the fix's
 * address, the same for everyone and cached under its tag; opened for a fix that was not removed, it is not there.
 */
export const instant = false;

export const metadata: Metadata = learnFixRemovedMetadata();

export default async function FixRemovedPage({ params }: PageProps<'/learn/fixes/_removed/[owner]/[repo]/[number]'>) {
  const { owner, repo, number } = await params;
  const pr = fixRefOf(owner, repo, number);
  const address = pr ? await loadFixAddress(pr) : null;
  if (!pr || address?.state !== 'REMOVED') notFound();
  return <FixRemovedView repo={pr.nameWithOwner} number={pr.number} />;
}
