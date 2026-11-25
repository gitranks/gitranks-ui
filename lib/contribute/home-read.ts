import type { ContributeHomeTotals } from './contribute-tab.documents';
import type { HomeAgentRead, HomeBoxesRead, HomeMergedRead, HomeNeedsYouRow } from './home-boxes';
import type { ContributeActivity, ContributeView } from '@/lib/workspace/contribute.types';
import { connectedKeyOf, contributeNoticesOf } from '@/lib/workspace/contribute-state';
import { dayLabel } from '@/lib/workspace/format';
import { MCP_CLIENT_NAMES } from '@/lib/workspace/mcp-setup';
import { KEY_NOTICE_KINDS, type KeyNotice } from '@/lib/workspace/notice-words';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';
import type { PullRequestListWithMerged } from '@/lib/workspace/pull-request-page.types';
import { learnStartConnectionOf } from '@/lib/workspace/start/start-page';

/*
 * Contribute home's reads, put together as its three boxes read them (`homeBoxesOf`): the list of the person's pull
 * requests, the totals, the agents' runs, what is connected and the first day. Pure, so every case has a spec.
 */

/** "14:00 UTC" today, "Nov 26, 14:00 UTC" on another day: a time as the workspace writes the day's limits. */
export function atWordsOf(iso: string, now: Date): string {
  const at = new Date(iso);
  const clock = `${at.toISOString().slice(11, 16)} UTC`;
  return at.toISOString().slice(0, 10) === now.toISOString().slice(0, 10) ? clock : `${dayLabel(iso)}, ${clock}`;
}

/**
 * The person's own agent by the name a page writes for it: its client's ("Claude Code"), else "Your agent"; null when
 * no connection of theirs has been used. Never the connection's own name, which the person may have typed.
 */
export function ownAgentNameOf(view: Pick<ContributeView, 'ownAgent'>): string | null {
  const connection = learnStartConnectionOf(view.ownAgent?.tokens);
  if (!connection) return null;
  return connection.client ? MCP_CLIENT_NAMES[connection.client] : 'Your agent';
}

const PERIODS = [
  { period: 'day', cap: 'dayCapUsd', spent: 'todayUsd' },
  { period: 'week', cap: 'weekCapUsd', spent: 'weekUsd' },
  { period: 'cycle', cap: 'cycleCapUsd', spent: 'cycleUsd' },
] as const;

/** What box 2 reads: the runs (null when they could not be read), what is connected, the key's notice, the holds. */
export function homeAgentReadOf(view: ContributeView, activity: ContributeActivity | null, now: Date): HomeAgentRead {
  const key = !!connectedKeyOf(view);
  const notice =
    (contributeNoticesOf(view).find((each): each is KeyNotice =>
      (KEY_NOTICE_KINDS as readonly string[]).includes(each.kind),
    ) as KeyNotice | undefined) ?? null;
  const settings = view.contributor?.settings;
  const spend = view.contributor?.spend;
  let capHold: HomeAgentRead['capHold'] = null;
  let paceHold: HomeAgentRead['paceHold'] = null;
  // Only the hosted agent spends against the caps and keeps the pace: both need a key that works.
  if (key && settings && spend) {
    if (spend.nextAttemptAt === null) {
      // No fix can start: the first cap set in GitRanks that has less left than one fix may spend.
      const held = PERIODS.find(({ cap, spent }) => {
        const set = settings[cap];
        return typeof set === 'number' && set - spend[spent] < settings.attemptCapUsd;
      });
      if (held) capHold = { period: held.period, attemptCapUsd: settings.attemptCapUsd };
    } else if (settings.pace === 'EVEN' && Date.parse(spend.nextAttemptAt) > now.getTime()) {
      paceHold = { at: atWordsOf(spend.nextAttemptAt, now), picksOwn: settings.hostedLevel !== 'MANUAL' };
    }
  }
  return { runs: activity ? activity.runs : null, own: ownAgentNameOf(view), key, notice, capHold, paceHold };
}

/** The rows that need the person, as box 1 reads them; null when the list could not be read. */
export const homeNeedsYouOf = (list: PullRequestListWithMerged | undefined): HomeNeedsYouRow[] | null =>
  list ? list.rows.filter((row) => row.group === 'NEEDS_YOU') : null;

/**
 * What box 3 reads: the totals, the newest merged pull request and those that wait for their maintainers. Null when the
 * list or the totals could not be read, or the list did not answer `merged`, so the box never says something untrue.
 */
export function homeMergedReadOf(
  list: PullRequestListWithMerged | undefined,
  totals: ContributeHomeTotals | null,
): HomeMergedRead | null {
  if (!list?.merged || !totals) return null;
  const row = list.merged.newest;
  const publicPage =
    row && list.merged.newestPublicPage && row.number
      ? prTimelinePath({ nameWithOwner: row.repo, number: row.number })
      : null;
  return {
    merged: totals.merged,
    reposHelped: totals.reposHelped,
    newest: row
      ? { repo: row.repo, issueNumber: row.issueNumber, title: row.title, mergedAt: row.since, publicPage }
      : null,
    waiting: list.rows.filter((each) => each.mark === 'MAINTAINERS').length,
  };
}

/** Every read of Contribute home's boxes, put together. */
export function homeBoxesReadOf({
  view,
  list,
  totals,
  activity,
  firstDay,
  skillsHref,
  now,
}: {
  view: ContributeView;
  list: PullRequestListWithMerged | undefined;
  totals: ContributeHomeTotals | null;
  activity: ContributeActivity | null;
  firstDay: boolean;
  skillsHref: string;
  now: Date;
}): HomeBoxesRead {
  return {
    firstDay,
    needsYou: homeNeedsYouOf(list),
    agent: homeAgentReadOf(view, activity, now),
    merged: homeMergedReadOf(list, totals),
    skillsHref,
  };
}
