import type { Route } from 'next';
import type { ReactNode } from 'react';

import { FixFoot, FixIssueCard, FixPageFrame } from './fix-frame';
import { HowItWasMade } from './how-it-was-made';
import type { PrTimeline, PrTimelineHelped } from '@/lib/workspace/pr-timeline.types';
import { fixBylineOf, fixStatePillOf, madeRowsOf } from '@/lib/workspace/pr-timeline-made';
import { prTimelineFallbackPath, prTimelineMarkdownPath } from '@/lib/workspace/pr-timeline-path';

export type MadePageProps = {
  timeline: PrTimeline;
  made: 'LEARN' | 'CONTRIBUTE';
  /** The row with the way back and the two views; none for a Contribute pull request. */
  row?: ReactNode;
  /** The agent as the fix names it; the timeline's own words without one. */
  agent?: string | null;
  /** The walkthrough's questions, for its row; null when the page does not show the walkthrough. */
  questions?: number | null;
  /** A Learn fix's part above the list. */
  learn?: ReactNode;
  helped: PrTimelineHelped | null;
  /** "What a GitRanks … pull request is", for maintainers. */
  aboutPr: { text: string; href: Route };
  /** "How … works", in the foot. */
  aboutProduct: { text: string; href: Route };
};

/** "How it was made" as its page draws it under the site's header (and Learn's bar for a Learn fix). */
export function MadePage({
  timeline,
  made,
  row = null,
  agent = null,
  questions = null,
  learn = null,
  helped,
  aboutPr,
  aboutProduct,
}: MadePageProps) {
  const pr = { nameWithOwner: timeline.nameWithOwner, number: timeline.number };
  return (
    <FixPageFrame
      row={row}
      card={
        <FixIssueCard
          repo={timeline.nameWithOwner}
          issue={timeline.issue.number}
          pr={{ number: timeline.number, url: timeline.url }}
          title={timeline.title?.trim() || `Pull request #${timeline.number}`}
          pill={fixStatePillOf(timeline)}
          byline={fixBylineOf(timeline, made, agent)}
          stopped={timeline.stopped}
        />
      }
    >
      <HowItWasMade
        timeline={timeline}
        rows={madeRowsOf(timeline, { questions })}
        learn={learn}
        helped={helped}
        links={{ rules: prTimelineFallbackPath(timeline.attemptId), about: aboutPr }}
      />
      <FixFoot markdownHref={prTimelineMarkdownPath(pr)} about={aboutProduct} />
    </FixPageFrame>
  );
}

/** A Contribute pull request's links: what one is, and how Contribute works. */
export const CONTRIBUTE_MADE_LINKS = {
  aboutPr: { text: 'What a GitRanks Contribute pull request is', href: '/contribute/maintainers' as Route },
  aboutProduct: { text: 'How Contribute works', href: '/contribute' as Route },
};
