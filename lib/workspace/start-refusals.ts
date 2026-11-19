import type { Route } from 'next';

import type { LimitCounts } from './limit-words';
import { pullRequestByAttemptPath, WORKSPACE_PATHS } from './paths';
import { isOpenPrsLimit } from './start/start-page';
import type { StartPageIssueView, StartPageRefusal } from './start/start-page.types';
import { CONTACT_EMAIL } from '@/lib/legal';

/**
 * Why an issue can't be started now, in one sentence with one next step: the texts the Start page says for each
 * refusal. The issue rows' Start says the same where the codes overlap.
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
function busyText(limit: number | null): string {
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
          : { href: WORKSPACE_PATHS.progress, label: 'My lessons' },
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
