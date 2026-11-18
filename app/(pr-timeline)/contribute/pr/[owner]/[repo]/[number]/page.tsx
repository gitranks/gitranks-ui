import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PrTimelineScreen } from '@/app/contribute/components/pr-timeline-view';
import { Header } from '@/components/header/header';
import { parsePrLink } from '@/lib/contribute/pr-feedback';
import { NO_PR, publicPrTimeline } from '@/lib/contribute/pr-timeline.data';

// No PR is known at build time: generateStaticParams lists one no repository has, so every real page renders on
// request as a whole page before the response starts, then is kept for its cache life. The proxy has asked the API
// first: a page that is not shown never gets here as a 200.
export const instant = false;

export async function generateStaticParams() {
  return [NO_PR];
}

type Params = PageProps<'/contribute/pr/[owner]/[repo]/[number]'>['params'];

async function prOf(params: Params) {
  const { owner, repo, number } = await params;
  const pr = parsePrLink(`${owner}/${repo}#${number}`);
  return pr && String(pr.number) === number ? pr : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pr = await prOf(params);
  const timeline = pr ? await publicPrTimeline(pr) : null;
  if (!timeline) return { title: 'Pull request timeline', robots: { index: false, follow: false } };
  return {
    title: `${timeline.title ?? `Pull request #${timeline.number}`} · ${timeline.nameWithOwner}#${timeline.number}`,
  };
}

/** A GitRanks Contribute pull request's public timeline: one cached page for everyone, no session read. */
export default async function PrTimelinePage({ params }: { params: Params }) {
  const pr = await prOf(params);
  const timeline = pr ? await publicPrTimeline(pr) : null;
  if (!timeline) notFound();
  return (
    <>
      <Header section="contribute" />
      <PrTimelineScreen timeline={timeline} />
    </>
  );
}
