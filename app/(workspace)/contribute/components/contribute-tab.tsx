import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { ContributeIssueList, IssuesTotalProvider, LiveIssuesCount } from './issue-list';
import { PicksDialog } from './picks-dialog';
import type { IssuesQuery } from '@/app/contribute/components/issues-filter';
import { IssuesFilters } from '@/app/contribute/components/issues-filters';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { HEADING } from '@/components/workspace/primitives';
import { RightNow } from '@/components/workspace/right-now';
import { type ContributeTabRead, introLineOf, numberTilesOf } from '@/lib/contribute/contribute-tab';
import { effectiveSettingOf } from '@/lib/workspace/access-limits';
import { lastUsedTokenOf } from '@/lib/workspace/agent-way';
import type {
  ContributeActivity,
  ContributeIssuePage,
  ContributeScheduleCounts,
  ContributeSet,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { accessNoticesOf, claudeKeyOf, isSuspended } from '@/lib/workspace/contribute-state';
import { MODELS, relativeLabel } from '@/lib/workspace/format';
import type { ConnectedAgents } from '@/lib/workspace/issue-row';
import { limitReachedOf } from '@/lib/workspace/limit-words';
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
  query: IssuesQuery;
  now?: Date;
};

/** The four numbers, each a link to the Pull requests tab filtered to Contribute. */
function Numbers({ tab }: { tab: ContributeTabRead }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-contribute-numbers="">
      {numberTilesOf(tab.totals).map((tile) => (
        <li key={tile.label}>
          <Link
            href={tile.href}
            prefetch={false}
            className="group flex h-full flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums">{tile.value}</span>
              <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-foreground" />
            </span>
            <span className="text-sm text-muted-foreground">{tile.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The Contribute tab: its head and four numbers, Right now while a Contribute run is at work, then Issues for you
 * (the line on how Start works, the count and the filters, then the list with its own notices).
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-7 pb-16" data-contribute-tab="">
      {/* The account's smaller limits; a held account is the list's own notice. */}
      <ContributeNotices notices={accessNoticesOf(view).filter(({ kind }) => kind !== 'suspended')} />
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
        <Numbers tab={tab} />
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
            pausedByYou={tab.pausedByYou}
            limit={limit}
            set={set}
            languages={view.contributor?.preferences?.languages ?? []}
            facts={{ capUsd: settings?.attemptCapUsd ?? null, keyWaiting }}
          />
        </section>
      </IssuesTotalProvider>
    </main>
  );
}
