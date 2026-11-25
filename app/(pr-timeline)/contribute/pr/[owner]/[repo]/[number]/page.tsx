import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { FixLearnBlock } from '@/components/learn/fix/fix-learn-block';
import { FixViewRow } from '@/components/workspace/fix-page/fix-frame';
import { CONTRIBUTE_MADE_LINKS, MadePage } from '@/components/workspace/fix-page/made-page';
import { prTimelineDescriptionOf, prTimelineJsonLdOf, prTimelineTitleOf } from '@/lib/contribute/pr-timeline-seo';
import { fixLearnBlockOf, hasLearnView, isLearnCanonical, type LearnFixPage } from '@/lib/learn/fix-page';
import { loadFixPage } from '@/lib/learn/fix-page.data';
import { loadFixCard } from '@/lib/learn/fix-share.data';
import { fixPreviewOf } from '@/lib/learn/fix-share-card';
import { LEARN_ABOUT_PATH, LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { learnFixPath } from '@/lib/learn/paths';
import { ALL_FIXES_PATH } from '@/lib/learn/real-issues';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { parsePrLink } from '@/lib/workspace/pr-feedback';
import { NO_PR, publicPrTimeline, publicPrTimelineHelped } from '@/lib/workspace/pr-timeline.data';
import type { PrTimeline } from '@/lib/workspace/pr-timeline.types';
import { prTimelineMarkdownPath, prTimelinePath } from '@/lib/workspace/pr-timeline-path';

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

const refOf = (timeline: PrTimeline) => ({ nameWithOwner: timeline.nameWithOwner, number: timeline.number });

/**
 * A Learn fix's public part, or none: a pull request made with Contribute (or an API that does not know the read
 * yet). A failed read throws, so the page is never kept as a Contribute pull request for a passing outage.
 */
async function learnFixOf(timeline: PrTimeline): Promise<LearnFixPage | null> {
  const fix = await loadFixPage(refOf(timeline));
  return fix?.made === 'LEARN' ? fix : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pr = await prOf(params);
  const timeline = pr ? await publicPrTimeline(pr) : null;
  if (!pr || !timeline) return { title: 'Pull request timeline', robots: { index: false, follow: false } };
  const [fix, card] = await Promise.all([learnFixOf(timeline), loadFixCard(refOf(timeline))]);
  const base = pageMetadata({
    title: prTimelineTitleOf(timeline),
    description: prTimelineDescriptionOf(timeline),
    path: prTimelinePath(timeline),
    openGraphType: 'article',
    publishedTime: timeline.openedAt,
  });
  // Only a shown page answers (the proxy's gate): it is indexed. A merged Learn fix points search engines to "Learn
  // from it", where the sitemap lists it; an open one is its own canonical until it merges. A posted link shows the
  // fix's picture.
  const preview = fixPreviewOf(card);
  return {
    ...base,
    alternates: {
      ...base.alternates,
      ...(isLearnCanonical(fix) ? { canonical: learnFixPath(refOf(timeline)) } : {}),
      types: { 'text/markdown': prTimelineMarkdownPath(timeline) },
    },
    robots: { index: true, follow: true },
    ...(preview
      ? {
          openGraph: { ...base.openGraph, ...preview },
          twitter: { ...base.twitter, card: 'summary_large_image', ...preview },
        }
      : {}),
  };
}

/**
 * A pull request's public page, "How it was made": one cached page for everyone, no session read. A Learn
 * fix shows Learn's bar, the row with its two views (one, for a pull request closed without a merge) and its Learn
 * part above the list; a Contribute pull request shows Contribute's header and no row.
 */
export default async function PrTimelinePage({ params }: { params: Params }) {
  const pr = await prOf(params);
  const timeline = pr ? await publicPrTimeline(pr) : null;
  if (!timeline) notFound();
  const at = refOf(timeline);
  const [fix, helped] = await Promise.all([learnFixOf(timeline), publicPrTimelineHelped(at)]);
  const block = fixLearnBlockOf(at, fix);
  return (
    <>
      <JsonLd
        payloads={prTimelineJsonLdOf(timeline, {
          made: fix ? 'LEARN' : 'CONTRIBUTE',
          questions: fix?.questions ?? null,
        })}
      />
      <Header section={fix ? 'learn' : 'contribute'} />
      {fix ? (
        <Suspense fallback={<LearnBar state={{ kind: 'visitor' }} place={null} />}>
          <LearnBarLive />
        </Suspense>
      ) : null}
      <MadePage
        timeline={timeline}
        made={fix ? 'LEARN' : 'CONTRIBUTE'}
        agent={fix?.agent ?? null}
        questions={fix?.questions ?? null}
        row={
          fix ? (
            <FixViewRow
              back={{ label: 'Issues', href: ALL_FIXES_PATH }}
              views={hasLearnView(fix) ? { learn: learnFixPath(at), made: prTimelinePath(at) } : null}
              current="made"
            />
          ) : null
        }
        learn={block ? <FixLearnBlock words={block} /> : null}
        helped={helped}
        {...(fix
          ? {
              aboutPr: { text: 'What a GitRanks Learn pull request is', href: LEARN_MAINTAINERS_PATH },
              aboutProduct: { text: 'How Learn works', href: LEARN_ABOUT_PATH },
            }
          : CONTRIBUTE_MADE_LINKS)}
      />
    </>
  );
}
