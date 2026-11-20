import type { Route } from 'next';

import { contributeErrorMessage } from './errors';
import { dayLabel, usd } from './format';
import type { IssueStart, IssueStartRefusal } from './issue-start';
import type { LimitCounts } from './limit-words';
import { KEY_REPLACE_PATH, pullRequestByAttemptPath, WORKSPACE_ANCHORS, WORKSPACE_PATHS } from './paths';
import { isOpenPrsLimit } from './start/start-page';
import type { StartPageIssueView, StartPageRefusal } from './start/start-page.types';
import { CONTACT_EMAIL } from '@/lib/legal';

/**
 * Why an issue can't be started now, in one sentence with one next step: the texts the Start page says for each
 * refusal (`startRefusalOf`) and those an issue row's hosted Start says (`issueStartRefusalOf`), the same where the
 * codes overlap.
 */

/**
 * A link the refusal leads to: one of the site's pages (`back` is the page's own back link, "Issues for you" or "Back to
 * the issues"), or an address outside it (`external`: an email to us).
 */
export type StartRefusalAction =
  | { href: Route; label: string; external?: false }
  | { href: string; label: string; external: true };

export type StartRefusalCopy =
  /** The open pull request limit: `LimitNotice`, its one wording, with its two links. */
  | { kind: 'limit'; counts: LimitCounts }
  /** A pause the viewer set: the sentence and Resume, which the page runs. */
  | { kind: 'paused-by-you'; text: string }
  | { kind: 'notice'; text: string; action: StartRefusalAction | null };

/** "One of your issues is being worked on, …", "3 of your issues are being worked on, …": `limit` is what holds. */
export function busyText(limit: number | null): string {
  const lead =
    limit === 1
      ? 'One of your issues is being worked on'
      : typeof limit === 'number' && limit > 1
        ? `${limit} of your issues are being worked on`
        : 'Your issues are being worked on';
  return `${lead}, the most at a time. One more can start when a run ends.`;
}

/** What the page says for the refusal of `view`; null for none, and for `YOURS`, which the page acts on. */
export function startRefusalOf(
  { start, current, limits }: StartPageIssueView,
  back: StartRefusalAction,
): StartRefusalCopy | null {
  const notice = (text: string, action: StartRefusalAction | null = back): StartRefusalCopy => ({
    kind: 'notice',
    text,
    action,
  });
  const refusal: StartPageRefusal | null = start.refusal;
  switch (refusal) {
    case null:
    case 'YOURS':
      return null;
    case 'OWN_IN_PROGRESS': {
      const name = current?.title ?? (current?.repo ? `${current.repo}#${current.issueNumber}` : null);
      return notice(
        `${name ? `Your lesson on “${name}” is` : 'Another lesson of yours is'} in progress. One lesson of your own at a time: this one can start once that one is done.`,
        current
          ? { href: pullRequestByAttemptPath(current.attemptId, { view: 'lesson' }), label: 'Back to your lesson' }
          : { href: WORKSPACE_PATHS.pullRequests, label: 'Pull requests' },
      );
    }
    case 'PAUSED_BY_YOU':
      return { kind: 'paused-by-you', text: "Contributing is paused, so your agent can't take an issue." };
    case 'ACCOUNT_PAUSED':
      return notice("This account can't start issues right now.", {
        href: `mailto:${CONTACT_EMAIL}`,
        label: 'Write to us',
        external: true,
      });
    case 'LIMIT_REACHED':
      if (isOpenPrsLimit(start.limit)) return { kind: 'limit', counts: limits.openPrs ?? { count: 0, limit: 0 } };
      return notice(busyText(limits.attempts), { href: WORKSPACE_PATHS.pullRequests, label: 'Pull requests' });
    case 'DAILY_LIMIT':
      return notice("You've started as many issues as one day allows. You can start more after 00:00 UTC.");
    case 'TAKEN':
      return notice("Someone else's agent took this issue.");
    case 'CLOSED':
      return notice('This issue was closed meanwhile.');
    case 'REPO_UNAVAILABLE':
      return notice("This project can't take a pull request from us right now.");
    default:
      // `UNAVAILABLE`, and a refusal this page doesn't know yet.
      return notice("This issue can't be started here.");
  }
}

/** What a row's hosted Start leads to when it can't start: a page, or the same Start again. */
export type IssueStartAction = StartRefusalAction | { retry: true; label: 'Try again' };

/**
 * A row's refusal: one sentence (or the limit's notice) and one next step, and what the row does then: stays, folds
 * away as a taken row does, or stays without a control until the list is read again.
 */
export type IssueStartRefusalCopy = {
  code: IssueStartRefusal | 'FAILED';
  text: string | null;
  /** `LIMIT_REACHED`: the limit's own notice in place of a sentence. */
  limit: LimitCounts | null;
  action: IssueStartAction | null;
  row: 'stays' | 'folds' | 'no-control';
};

/** What the row knows besides the answer: the run's cap, and which way the key waits. */
export type IssueStartFacts = { capUsd?: number | null; keyWaiting?: 'EXHAUSTED' | 'LIMIT_REACHED' | null };

const TRY_AGAIN = { retry: true, label: 'Try again' } as const;
const until = (iso: string | null) => (dayLabel(iso) ? ` until ${dayLabel(iso)}` : '');

/** The words for a failed or timed-out Start whose run could not be found either. */
export const ISSUE_START_FAILED: IssueStartRefusalCopy = {
  code: 'FAILED',
  text: contributeErrorMessage('FAILED'),
  limit: null,
  action: TRY_AGAIN,
  row: 'stays',
};

/** What a row says when its hosted Start is refused; null when the answer refused nothing. */
export function issueStartRefusalOf(answer: IssueStart, facts: IssueStartFacts = {}): IssueStartRefusalCopy | null {
  const { refusal } = answer;
  if (!refusal) return null;
  const say = (
    text: string,
    action: IssueStartAction | null = null,
    row: IssueStartRefusalCopy['row'] = 'stays',
  ): IssueStartRefusalCopy => ({ code: refusal, text, limit: null, action, row });
  switch (refusal) {
    case 'AGENT_BUSY':
      return say(
        busyText(answer.value),
        answer.holder
          ? { href: pullRequestByAttemptPath(answer.holder.id), label: 'See the run' }
          : { href: WORKSPACE_PATHS.agentRuns, label: 'All runs' },
      );
    case 'CLAIM_PENDING':
      return say('Your last Start is still being checked. Try again in a minute.', TRY_AGAIN);
    case 'LIMIT_REACHED': {
      const value = answer.value ?? 0;
      return { code: refusal, text: null, limit: { count: value, limit: value }, action: null, row: 'stays' };
    }
    case 'BUDGET': {
      const cap =
        typeof facts.capUsd === 'number' && facts.capUsd > 0 ? ` A run can cost up to ${usd(facts.capUsd)}.` : '';
      return say(`Your budget leaves no room for one more run${until(answer.until)}.${cap}`, {
        href: WORKSPACE_ANCHORS.agentBudget,
        label: 'Budget and pacing',
      });
    }
    case 'DAILY_LIMIT':
      return say("You've started as many issues as one day allows. You can start more after 00:00 UTC.");
    case 'PLATFORM_FULL':
      return say('GitRanks has started as many runs as it can today. You can start one after 00:00 UTC.');
    case 'TRY_LATER':
      return say("GitRanks can't start a run right now. Try again in a few minutes.", TRY_AGAIN);
    case 'KEY_INVALID':
      return say('Your Claude key stopped working. Nothing can start on it.', {
        href: KEY_REPLACE_PATH,
        label: 'Replace the key',
      });
    case 'KEY_WAITING':
      return say(
        facts.keyWaiting === 'LIMIT_REACHED'
          ? `Your Claude workspace reached its spend limit${until(answer.until)}.`
          : facts.keyWaiting === 'EXHAUSTED'
            ? `Your Claude credits are used up${until(answer.until)}.`
            : `Your Claude key can't be used${until(answer.until)}.`,
        { href: WORKSPACE_PATHS.agent, label: 'Agent' },
      );
    case 'NO_KEY':
      return say('The hosted agent needs a Claude key.', { href: WORKSPACE_PATHS.agentKey, label: 'Add a key' });
    case 'TAKEN':
      return say("Someone else's agent took this issue.", null, 'folds');
    case 'CLOSED':
      return say('This issue was closed meanwhile.', null, 'folds');
    case 'REPO_UNAVAILABLE':
      return say("This project can't take a pull request from us right now.", null, 'no-control');
    case 'ACCOUNT_PAUSED':
      return say("This account can't start issues right now.", {
        href: `mailto:${CONTACT_EMAIL}`,
        label: 'Write to us',
        external: true,
      });
    default:
      // `UNAVAILABLE`, and a refusal this row doesn't know yet.
      return say("This issue can't be started any more.", null, 'folds');
  }
}
