import { Info } from 'lucide-react';
import Link from 'next/link';

import { ContributeHomeBoxes } from './home-boxes';
import { ContributeIssueList } from './issue-list';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import { FairUseBanners } from '@/components/workspace/fair-use-banners';
import { HEADING } from '@/components/workspace/primitives';
import type { HomeBoxesRead } from '@/lib/contribute/home-boxes';
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
import { relativeLabel } from '@/lib/workspace/format';
import type { ConnectedAgents } from '@/lib/workspace/issue-row';
import { limitReachedOf } from '@/lib/workspace/limit-words';
import { looksShortLineOf, looksTipOf, type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';
import type { IssueLooksToday } from '@/lib/workspace/masked-issue.types';
import { ABOUT_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';

const LINK = 'font-semibold text-link hover:underline';
const QUIET_LINK = 'underline underline-offset-2 hover:text-foreground';

/** Everything the page shows, as it read it. */
export type ContributeTabData = {
  view: ContributeView;
  agents: ConnectedAgents;
  /** The three boxes' reads, put together (`homeBoxesReadOf`). */
  home: HomeBoxesRead;
  /** The agents' runs as the page read them; the boxes follow them live. Null when they could not be read. */
  activity: ContributeActivity | null;
  /** The first page of issues; `undefined` when the API did not answer it. */
  page: ContributeIssuePage | null | undefined;
  set?: ContributeSet | null;
  counts?: Pick<ContributeScheduleCounts, 'prBound'>;
  /** What the top shows about fair use; null or left out when the API answers nothing. */
  fairUse?: ContributeFairUseNotices | null;
  /** For masked rows: the day's full issues, the numbers of a night. */
  masked?: MaskedListReads;
  now: Date;
};

/** Under a minute ago, or a time ahead of the page's clock (the server's clock may lead): "just now". */
const JUST_NOW_MS = 60_000;

/** When the list was picked, in words: "1 hour ago", "just now"; '' when not known. */
function pickedWhenOf(computedAt: string | null | undefined, now: Date): string {
  if (!computedAt) return '';
  const at = Date.parse(computedAt);
  if (Number.isNaN(at)) return '';
  return now.getTime() - at < JUST_NOW_MS ? 'just now' : relativeLabel(computedAt, now);
}

/** "Picked for your languages and topics, 1 hour ago. …": when the list was picked, while it is known. */
export function pickedLineOf(computedAt: string | null | undefined, now: Date): string {
  const when = pickedWhenOf(computedAt, now);
  return when
    ? `Picked for your languages and topics, ${when}. See one in full before you decide.`
    : 'For your languages and topics. See one in full before you decide.';
}

/** "12 of 30 full issues left today." with its tip: how the day's limit is worked out. None left: no line. */
function LooksShortLine({ looks }: { looks: IssueLooksToday }) {
  const line = looksShortLineOf(looks);
  if (!line) return null;
  return (
    <p className="m-0 flex items-center gap-1.5 text-sm text-muted-foreground" data-looks-short-line="">
      {line}
      <AdaptiveTooltip
        trigger={
          <button
            type="button"
            aria-label="How your daily limit is worked out"
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        }
        contentClassName="max-w-xs"
      >
        <span className="block max-w-xs" data-looks-tip="">
          {looksTipOf(looks)}
        </span>
      </AdaptiveTooltip>
    </p>
  );
}

/**
 * Contribute home: the messages about fair use, the three boxes (a pull request that needs the person, their agent,
 * what was merged), "Issues for you" with its line, the day's full issues and the list, then a line about Learn and
 * one on where the rest lives.
 */
export function ContributeTabScreen({
  view,
  agents,
  home,
  activity,
  page,
  set,
  counts,
  fairUse,
  masked = NO_MASKED_READS,
  now,
}: ContributeTabData) {
  const settings = view.contributor?.settings;
  const limits = view.contributor?.limits;
  const held = isSuspended(view);
  const limit = held ? null : limitReachedOf(counts, settings, limits);
  const key = claudeKeyOf(view);
  const keyWaiting = key?.state === 'EXHAUSTED' || key?.state === 'LIMIT_REACHED' ? key.state : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-7 pb-16" data-contribute-tab="">
      <h1 className="sr-only">Contribute</h1>
      <FairUseBanners fairUse={fairUse} />
      <ContributeHomeBoxes read={home} activity={activity} />

      <section aria-labelledby="issues-heading" id="issues" className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="issues-heading" className={HEADING.section}>
              Issues for you
            </h2>
            {held ? null : (
              <p className="m-0 text-sm text-muted-foreground" data-picked-line="">
                {pickedLineOf(page?.computedAt, now)}
              </p>
            )}
            {held || !masked.looks ? null : <LooksShortLine looks={masked.looks} />}
          </div>
          <Link href={WORKSPACE_PATHS.settingsWork} prefetch={false} className={`${LINK} text-sm`}>
            What you work on
          </Link>
        </div>
        <ContributeIssueList
          page={page}
          agents={agents}
          held={held}
          heldAnswerHref={fairUse?.block ? fairUseAnswerPathOf(fairUse.block.id) : undefined}
          limit={limit}
          set={set}
          languages={view.contributor?.preferences?.languages ?? []}
          facts={{ capUsd: settings?.attemptCapUsd ?? null, keyWaiting }}
          masked={masked}
        />
      </section>

      <div className="flex flex-col gap-2" data-home-foot="">
        <p className="m-0 text-sm text-muted-foreground">
          Want to understand the fixes your agent makes?{' '}
          <Link href={WORKSPACE_PATHS.learnHome} prefetch={false} className={LINK}>
            GitRanks Learn
          </Link>{' '}
          teaches what each fix uses, a lesson at a time.
        </p>
        <p className="m-0 text-xs text-muted-foreground">
          The model, the spend caps and the key are on{' '}
          <Link href={WORKSPACE_PATHS.agent} prefetch={false} className={QUIET_LINK}>
            the Agent tab
          </Link>
          . What you work on and your limits are in{' '}
          <Link href={WORKSPACE_PATHS.settings} prefetch={false} className={QUIET_LINK}>
            Settings
          </Link>
          .{' '}
          <Link href={ABOUT_PATH} prefetch={false} className={QUIET_LINK}>
            How Contribute works
          </Link>
        </p>
      </div>
    </main>
  );
}
