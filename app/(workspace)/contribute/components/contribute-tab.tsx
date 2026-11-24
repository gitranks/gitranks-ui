import Link from 'next/link';

import { ContributeIssueList, IssuesTotalProvider, LiveIssuesCount } from './issue-list';
import { PicksDialog } from './picks-dialog';
import type { IssuesQuery } from '@/app/contribute/components/issues-filter';
import { IssuesFilters } from '@/app/contribute/components/issues-filters';
import { FairUseBanners } from '@/components/workspace/fair-use-banners';
import { NumberTiles } from '@/components/workspace/number-tiles';
import { HEADING } from '@/components/workspace/primitives';
import { RightNow } from '@/components/workspace/right-now';
import { type ContributeTabRead, introLineOf, numberTilesOf } from '@/lib/contribute/contribute-tab';
import { effectiveSettingOf } from '@/lib/workspace/access-limits';
import { lastUsedTokenOf } from '@/lib/workspace/agent-way';
import type {
  ContributeActivity,
  ContributeFairUseNotices,
  ContributeIssuePage,
  ContributeScheduleCounts,
  ContributeSet,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isSuspended } from '@/lib/workspace/contribute-state';
import { fairUseAnswerPathOf } from '@/lib/workspace/fair-use';
import { MODELS, relativeLabel } from '@/lib/workspace/format';
import type { ConnectedAgents } from '@/lib/workspace/issue-row';
import { limitReachedOf } from '@/lib/workspace/limit-words';
import { looksLongLineOf, type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';
import { ABOUT_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';

const link = 'font-semibold text-link hover:underline';

/** Everything the tab shows, as the page read it. */
export type ContributeTabData = {
  view: ContributeView;
  agents: ConnectedAgents;
  learnOpen: boolean;
  tab: ContributeTabRead;
  /** The first page of issues; `undefined` when the API did not answer it. */
  page: ContributeIssuePage | null | undefined;
  set?: ContributeSet | null;
  activity: ContributeActivity | null;
  counts?: Pick<ContributeScheduleCounts, 'prBound'>;
  /** What the top shows about fair use; null or left out when the API answers nothing. */
  fairUse?: ContributeFairUseNotices | null;
  /** For masked rows: the day's full issues, the numbers of a night. */
  masked?: MaskedListReads;
  query: IssuesQuery;
  now: Date;
};

/**
 * The Contribute tab: the messages about fair use, its head and four numbers, Right now while a Contribute run is at
 * work, then Issues for you (the line on the day's full issues, the line on how Start works, the count and the filters,
 * then the list with its own notices).
 */
export function ContributeTabScreen({
  view,
  agents,
  learnOpen,
  tab,
  page,
  set,
  activity,
  counts,
  fairUse,
  masked = NO_MASKED_READS,
  query,
  now,
}: ContributeTabData) {
  const settings = view.contributor?.settings;
  const limits = view.contributor?.limits;
  const held = isSuspended(view);
  const limit = held ? null : limitReachedOf(counts, settings, limits);
  const intro = introLineOf(agents, tab.hostedLevel);
  const model = settings?.mainModel ? MODELS[settings.mainModel]?.replace(/^Claude /, '') : null;
  const ownName = lastUsedTokenOf(view.ownAgent?.tokens)?.name ?? null;
  const key = claudeKeyOf(view);
  const keyWaiting = key?.state === 'EXHAUSTED' || key?.state === 'LIMIT_REACHED' ? key.state : null;
  // The day's full issues and what they are made of; a day that could not be read says nothing.
  const looksLine = held || !masked.looks ? null : looksLongLineOf(masked.looks);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-7 pb-16" data-contribute-tab="">
      <FairUseBanners fairUse={fairUse} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className={HEADING.page}>Contribute</h1>
          <Link href={ABOUT_PATH} prefetch={false} className={`${link} text-sm`}>
            How Contribute works →
          </Link>
        </div>
        <p className="max-w-prose text-muted-foreground">
          Your agent fixes open-source issues that fit your stack, you review every change, and the pull request opens
          in your name.
        </p>
        <NumberTiles tiles={numberTilesOf(tab.totals)} name="contribute" />
      </div>

      <RightNow
        activity={activity}
        side="fix"
        notes={{
          hosted: { note: ['on your Claude key', model].filter(Boolean).join(' · ') },
          own: { note: ownName },
        }}
        slots={settings ? effectiveSettingOf(settings, limits, 'attemptsAtATime') : null}
      />

      <IssuesTotalProvider>
        <section aria-labelledby="issues-heading" id="issues" className="flex scroll-mt-24 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 id="issues-heading" className={HEADING.section}>
                Issues for you
              </h2>
              {looksLine ? (
                <p className="max-w-prose text-sm text-muted-foreground" data-looks-long-line="">
                  {looksLine}
                </p>
              ) : null}
              {limit || held ? null : (
                <p className="max-w-prose text-sm text-foreground/80" data-intro="">
                  {intro.text}
                  {intro.agentLink ? (
                    <>
                      <Link href={WORKSPACE_PATHS.agent} prefetch={false} className={link}>
                        Agent tab
                      </Link>
                      {intro.after}
                    </>
                  ) : null}
                </p>
              )}
              {page && !held ? (
                <p className="text-sm text-muted-foreground">
                  <LiveIssuesCount total={page.total} /> match your languages and topics
                  {page.computedAt ? ` · picked ${relativeLabel(page.computedAt, now)}` : ''} ·{' '}
                  <Link href={WORKSPACE_PATHS.settingsWork} prefetch={false} className={link}>
                    What you work on
                  </Link>
                </p>
              ) : null}
            </div>
            {held ? null : (
              <div className="flex items-center gap-2">
                <PicksDialog />
                <IssuesFilters query={query} />
              </div>
            )}
          </div>
          <ContributeIssueList
            page={page}
            agents={agents}
            filter={query}
            learnOpen={learnOpen}
            held={held}
            heldAnswerHref={fairUse?.block ? fairUseAnswerPathOf(fairUse.block.id) : undefined}
            limit={limit}
            set={set}
            languages={view.contributor?.preferences?.languages ?? []}
            facts={{ capUsd: settings?.attemptCapUsd ?? null, keyWaiting }}
            masked={masked}
          />
        </section>
      </IssuesTotalProvider>
    </main>
  );
}
