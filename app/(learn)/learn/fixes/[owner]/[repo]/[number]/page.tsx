import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnFromIt } from '@/components/learn/fix/learn-from-it';
import {
  FixChangeCard,
  FixFoot,
  FixIssueCard,
  FixPageFrame,
  FixViewRow,
} from '@/components/workspace/fix-page/fix-frame';
import { hasLearnView } from '@/lib/learn/fix-page';
import { loadFixPage } from '@/lib/learn/fix-page.data';
import { LEARN_ABOUT_PATH } from '@/lib/learn/learn-path';
import { fromLearn, learnFixPath } from '@/lib/learn/paths';
import { ALL_FIXES_PATH } from '@/lib/learn/real-issues';
import { fixTitleOf, learnFixJsonLd, learnFixMetadata } from '@/lib/learn/seo/fix';
import { fixRefOf } from '@/lib/learn/walkthrough';
import { pullRequestPath } from '@/lib/workspace/paths';
import { NO_PR, publicPrTimeline } from '@/lib/workspace/pr-timeline.data';
import { fixBylineOf, fixChangeOf, fixStatePillOf } from '@/lib/workspace/pr-timeline-made';
import { prTimelineMarkdownPath, prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/**
 * The public page of a fix, "Learn from it" (page 12): one cached page for everyone, read with no session. The proxy
 * has asked where the address leads first (`lib/learn/fix-gate.ts`): nothing there gets a real 404, a removed fix its
 * 410, and a pull request with no such view (made with Contribute, or closed without a merge) goes to "How it was
 * made". The person's marks are read in the browser and fill places of fixed size.
 */
export const instant = false;

export async function generateStaticParams() {
  return [NO_PR];
}

type Params = PageProps<'/learn/fixes/[owner]/[repo]/[number]'>['params'];

async function readOf(params: Params) {
  const { owner, repo, number } = await params;
  const pr = fixRefOf(owner, repo, number);
  if (!pr) return { pr: null, timeline: null, fix: null };
  // A failed timeline read is a page with nothing to show: the not-found page, never an error.
  const [timeline, fix] = await Promise.all([publicPrTimeline(pr).catch(() => null), loadFixPage(pr)]);
  return { pr, timeline, fix };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { timeline, fix } = await readOf(params);
  return learnFixMetadata(timeline, hasLearnView(fix) ? fix : null);
}

export default async function LearnFixPage({ params }: { params: Params }) {
  const { pr, timeline, fix } = await readOf(params);
  if (!pr || !timeline) notFound();
  const at = { nameWithOwner: timeline.nameWithOwner, number: timeline.number };
  // No "Learn from it" for this pull request, or its read failed: "How it was made" is always there.
  if (!fix || !hasLearnView(fix)) redirect(prTimelinePath(at));
  return (
    <>
      <JsonLd payloads={learnFixJsonLd(at, timeline, fix)} />
      <FixPageFrame
        row={
          <FixViewRow
            back={{ label: 'Issues', href: ALL_FIXES_PATH }}
            views={{ learn: learnFixPath(at), made: prTimelinePath(at) }}
            current="learn"
          />
        }
        card={
          <FixIssueCard
            repo={timeline.nameWithOwner}
            issue={timeline.issue.number}
            pr={{ number: timeline.number, url: timeline.url }}
            title={fixTitleOf(timeline)}
            pill={fixStatePillOf(timeline)}
            byline={fixBylineOf(timeline, 'LEARN', fix.agent)}
            stopped={timeline.stopped}
          />
        }
      >
        <LearnFromIt
          pr={at}
          fix={fix}
          pullRequest={fromLearn(pullRequestPath({ repo: timeline.nameWithOwner, issue: timeline.issue.number }))}
        >
          <FixChangeCard change={fixChangeOf(timeline)} />
        </LearnFromIt>
        <FixFoot
          markdownHref={prTimelineMarkdownPath(at)}
          about={{ text: 'How Learn works', href: LEARN_ABOUT_PATH }}
        />
      </FixPageFrame>
    </>
  );
}
