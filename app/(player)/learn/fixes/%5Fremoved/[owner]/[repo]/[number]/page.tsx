import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FixRemovedView } from '@/components/learn/walkthrough/walkthrough-parts';
import { learnFixRemovedMetadata } from '@/lib/learn/seo/walkthrough';
import { fixRefOf } from '@/lib/learn/walkthrough';

/**
 * `/learn/fixes/_removed/<owner>/<repo>/<number>`, where the proxy shows a fix whose pages were removed, with a 410
 * (`lib/learn/fix-gate.ts`), once the API said so. `_removed` is no GitHub owner's shape, so no fix is ever under it,
 * and the proxy answers this address opened directly with the 404: the page reads nothing.
 */
export const instant = false;

export const metadata: Metadata = learnFixRemovedMetadata();

export default async function FixRemovedPage({ params }: PageProps<'/learn/fixes/_removed/[owner]/[repo]/[number]'>) {
  const { owner, repo, number } = await params;
  const pr = fixRefOf(owner, repo, number);
  if (!pr) notFound();
  return <FixRemovedView repo={pr.nameWithOwner} number={pr.number} />;
}
