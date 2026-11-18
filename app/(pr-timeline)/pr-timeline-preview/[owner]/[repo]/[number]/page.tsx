import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PrTimelineScreen } from '@/app/contribute/components/pr-timeline-view';
import { Header } from '@/components/header/header';
import { parsePrLink } from '@/lib/contribute/pr-feedback';
import { viewerPrTimeline } from '@/lib/contribute/pr-timeline-viewer.data';

/**
 * A blocking route: it reads the session (the API's list needs the login), and a page the API does not show this
 * viewer must answer a real 404, not a 200 shell streaming one.
 */
export const instant = false;

export const metadata: Metadata = { title: 'Pull request timeline', robots: { index: false, follow: false } };

/**
 * A pull request timeline before the pages are public, for the people the API names: the proxy rewrites the page's
 * address here for a visitor with a session (and answers this address itself with a 404). Never cached.
 */
export default async function PrTimelinePreviewPage({
  params,
}: PageProps<'/pr-timeline-preview/[owner]/[repo]/[number]'>) {
  const { owner, repo, number } = await params;
  const pr = parsePrLink(`${owner}/${repo}#${number}`);
  const timeline = pr && String(pr.number) === number ? await viewerPrTimeline(pr).catch(() => null) : null;
  if (!timeline) notFound();
  return (
    <>
      <Header section="contribute" />
      <PrTimelineScreen timeline={timeline} />
    </>
  );
}
