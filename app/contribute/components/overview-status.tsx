import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AgentFirstPicks, AgentNextSteps, AgentWelcome } from './agent-connected';
import { ContributeNotices } from './contribute-notices';
import { FirstRunGuide } from './first-run-guide';
import { ImpactSection, NeedsYouSection, RightNowSection, UpNextSection, WaysSection } from './overview-sections';
import type {
  ContributeComingSoonProvider,
  ContributeImpactTotals,
  ContributeIssuePage,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { contributeNoticesOf } from '@/lib/contribute/contribute-state';
import { agentFirstRunStepOf, firstRunNoticesOf, firstRunStepOf } from '@/lib/contribute/first-run';
import type { McpClient } from '@/lib/contribute/mcp-setup';
import type { OverviewNeedsRead, OverviewNowRead } from '@/lib/contribute/overview';
import { cn } from '@/lib/utils';

/** The landing again, for a user who is onboarded. */
export const ABOUT_PATH = '/contribute?about=1' as Route;

/**
 * Overview's sections, each read on its own: the page passes each in a `<Suspense>` of its own, so one that is slow or
 * fails leaves the rest. Before the first attempt only Ways is shown.
 */
export type OverviewSections = {
  needs: ReactNode;
  now: ReactNode;
  impact: ReactNode;
  ways: ReactNode;
  upNext: ReactNode;
};

/** What each section read, all at once: for a page read in one go, as the specs render it. */
export type OverviewData = {
  needs: OverviewNeedsRead;
  now: OverviewNowRead;
  impact: ContributeImpactTotals | undefined;
  noted: readonly ContributeComingSoonProvider[];
  /** The feed's first page: Up next's, and what Right now's "no issues" is told from. */
  page: ContributeIssuePage | null | undefined;
};

/** The sections from what they read. */
export const overviewSectionsOf = (view: ContributeView, data: OverviewData, now?: Date): OverviewSections => ({
  needs: <NeedsYouSection view={view} read={data.needs} now={now} />,
  now: <RightNowSection view={view} read={data.now} page={data.page} now={now} />,
  impact: <ImpactSection view={view} totals={data.impact} />,
  ways: <WaysSection view={view} noted={data.noted} now={now} />,
  upNext: <UpNextSection page={data.page} />,
});

/** The maintainers' strip and the way back to the pitch. */
function OverviewFooter() {
  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-4 border-t pt-5 text-sm text-muted-foreground"
      data-overview="footer"
    >
      <p>
        <span className="font-semibold text-foreground">Maintain a repo?</span> At most one PR at a time, and every PR
        says it was made with AI.{' '}
        <Link href={MAINTAINERS_PATH} prefetch={false} className="font-semibold text-link">
          Opt it out →
        </Link>
      </p>
      <Link href={ABOUT_PATH} prefetch={false} className="inline-flex min-h-10 items-center font-semibold text-link">
        How Contribute works
      </Link>
    </footer>
  );
}

/**
 * The overview of an onboarded user: what needs them, what runs right now, their impact, the ways they contribute and
 * what comes next, then the maintainers' strip. Before their first attempt, the guide of what happens next takes the
 * place of all but Ways: the key's (A3), or the own agent's (B2). `welcome` opens it once, after the own-agent path,
 * with the check.
 */
export function OverviewScreen({
  view,
  now,
  sections,
  firstRun,
  agentFirstRun,
  welcome,
}: {
  view: ContributeView;
  now?: Date;
  /** The sections; before the first attempt only `ways` is rendered. */
  sections: OverviewSections;
  /** No attempt yet, with the feed's first page (`undefined`: not answered). */
  firstRun?: { page: ContributeIssuePage | null | undefined };
  /** The user's own agent has made no attempt yet, with the feed's first page. */
  agentFirstRun?: { page: ContributeIssuePage | null | undefined };
  /** The client the user's own agent was just connected with. */
  welcome?: McpClient;
}) {
  return (
    <main
      className={cn(
        'mx-auto w-full max-w-7xl px-4 flex flex-col pb-16',
        welcome ? 'gap-5.5 pt-6 sm:gap-8 sm:pt-10' : 'gap-8 pt-6 sm:pt-8',
      )}
      data-overview={firstRun || agentFirstRun ? 'first-run' : 'home'}
    >
      {welcome ? <AgentWelcome client={welcome} /> : <h1 className="sr-only">Overview</h1>}
      {agentFirstRun ? (
        <>
          <div className="flex flex-col gap-3">
            <ContributeNotices notices={firstRunNoticesOf(contributeNoticesOf(view), agentFirstRunStepOf(view))} />
            <AgentNextSteps view={view} client={welcome} />
          </div>
          <AgentFirstPicks page={agentFirstRun.page} />
          {sections.ways}
        </>
      ) : firstRun ? (
        <>
          <div className="flex flex-col gap-3">
            <ContributeNotices
              notices={firstRunNoticesOf(contributeNoticesOf(view), firstRunStepOf(view, firstRun.page, now))}
            />
            <FirstRunGuide view={view} page={firstRun.page} now={now} />
          </div>
          {sections.ways}
        </>
      ) : (
        <>
          {sections.needs}
          {sections.now}
          {sections.impact}
          {sections.ways}
          {sections.upNext}
        </>
      )}
      <OverviewFooter />
    </main>
  );
}
