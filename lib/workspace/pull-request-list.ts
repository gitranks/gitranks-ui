import { relativeLabel } from './format';
import { onDayOf } from './pull-request-page';
import type {
  PullRequestBox,
  PullRequestList,
  PullRequestListGroup,
  PullRequestListMark,
  PullRequestListRow,
} from './pull-request-page.types';

/**
 * The words of the list of a person's pull requests, for Learn and Contribute: its groups, a row's line and button,
 * the line about the limit and the empty page.
 */

export const GROUP_WORDS: Record<PullRequestListGroup, string> = {
  NEEDS_YOU: 'Needs you',
  IN_PROGRESS: 'In progress',
  ENDED: 'Ended',
};

const GROUPS: readonly PullRequestListGroup[] = ['NEEDS_YOU', 'IN_PROGRESS', 'ENDED'];

/** "Ended" shows this many more at a time. */
export const ENDED_PAGE = 20;

/**
 * A box's group and mark, the same table the API answers with. The list draws the API's own `group` and `mark`; this
 * keeps fixtures and specs on the same rule.
 */
export const LIST_PLACE: Record<PullRequestBox, { group: PullRequestListGroup; mark: PullRequestListMark | null }> = {
  WALKTHROUGH: { group: 'NEEDS_YOU', mark: 'NEEDS_YOU' },
  APPROVE: { group: 'NEEDS_YOU', mark: 'NEEDS_YOU' },
  ONLY_YOU: { group: 'NEEDS_YOU', mark: 'NEEDS_YOU' },
  ROUND_WAITING: { group: 'NEEDS_YOU', mark: 'NEEDS_YOU' },
  ROUND_READY: { group: 'NEEDS_YOU', mark: 'NEEDS_YOU' },
  FIXING: { group: 'IN_PROGRESS', mark: 'AGENT_WORKING' },
  WRITING_WALKTHROUGH: { group: 'IN_PROGRESS', mark: 'AGENT_WORKING' },
  REWRITING_WALKTHROUGH: { group: 'IN_PROGRESS', mark: 'AGENT_WORKING' },
  ROUND_WORKING: { group: 'IN_PROGRESS', mark: 'AGENT_WORKING' },
  OPENING: { group: 'IN_PROGRESS', mark: 'AGENT_WORKING' },
  OPEN: { group: 'IN_PROGRESS', mark: 'MAINTAINERS' },
  WITH_MAINTAINERS: { group: 'IN_PROGRESS', mark: 'MAINTAINERS' },
  MERGED: { group: 'ENDED', mark: 'MERGED' },
  CLOSED: { group: 'ENDED', mark: null },
  STOPPED: { group: 'ENDED', mark: null },
  DISCARDED: { group: 'ENDED', mark: null },
};

export type ListGroup = { group: PullRequestListGroup; title: string; rows: PullRequestListRow[] };

/** The groups in their order, each with its rows as the API ordered them; a group with no rows is left out. */
export function groupsOf(rows: readonly PullRequestListRow[]): ListGroup[] {
  return GROUPS.flatMap((group) => {
    const inGroup = rows.filter((row) => row.group === group);
    return inGroup.length ? [{ group, title: GROUP_WORDS[group], rows: inGroup }] : [];
  });
}

/** A hosted run has a cost; a run of the person's own agent has none. */
const isHosted = (row: Pick<PullRequestListRow, 'costUsd'>) => row.costUsd !== null;

/** `$3.12`. */
export const costOf = (usd: number) => `$${usd.toFixed(2)}`;

/** The boxes whose line names the agent at work, so the facts do not name it again. */
const AGENT_AT_WORK: readonly PullRequestBox[] = [
  'FIXING',
  'WRITING_WALKTHROUGH',
  'REWRITING_WALKTHROUGH',
  'ROUND_WORKING',
];

/**
 * The line and the button of a pull request that needs the person, in the words of its own page: the list's rows and
 * the home page's card word it here, so the two never differ. Null for a box that needs nothing from them.
 */
export function needsYouWordsOf(
  row: Pick<PullRequestListRow, 'box' | 'round'>,
): { line: string; button: string } | null {
  const round = row.round ?? 1;
  switch (row.box) {
    case 'WALKTHROUGH':
      return { line: 'The fix walkthrough is ready', button: 'Start the walkthrough' };
    case 'APPROVE':
      return { line: 'Ready to open the pull request', button: 'Read and approve' };
    case 'ONLY_YOU':
      return { line: 'Only you can do this', button: 'See what to do' };
    case 'ROUND_WAITING':
      return { line: `Round ${round}: something to answer`, button: 'See what was asked' };
    case 'ROUND_READY':
      return { line: `Round ${round} is ready: your agent made the change`, button: 'Read and approve' };
    default:
      return null;
  }
}

/**
 * A row's words: one line on where the fix stands (the pull request page's words), when it got there, its facts (the
 * agent, the cost of a hosted run) and its one button, which says what opening it does.
 */
export type RowWords = { line: string; when: string | null; agent: string | null; cost: string | null; button: string };

export function rowWordsOf(row: PullRequestListRow, now: Date): RowWords {
  const hosted = isHosted(row);
  const who = hosted ? 'The hosted agent' : row.agent?.trim() || 'Your agent';
  const round = row.round ?? 1;
  const ago = `Started ${relativeLabel(row.since, now)}`;
  const on = onDayOf(row.since, now);
  const words = (line: string, button: string, when: string | null = null) => ({ line, button, when });
  const shown = (() => {
    const needsYou = needsYouWordsOf(row);
    if (needsYou) return words(needsYou.line, needsYou.button);
    switch (row.box) {
      case 'FIXING':
        return words(`${who} is fixing the issue`, 'Open', ago);
      case 'WRITING_WALKTHROUGH':
        return words(`${who} is writing the walkthrough`, 'Open', ago);
      case 'REWRITING_WALKTHROUGH':
        return words(`${who} is rewriting the walkthrough`, 'Open', ago);
      case 'ROUND_WORKING':
        return words(`${who} is working on round ${round}`, 'Open', ago);
      case 'OPENING':
        return words('The pull request is being opened', 'Open');
      case 'OPEN':
        return words('Pull request open · waiting for a maintainer', 'Open', `Opened ${on.replace(/^on /, '')}`);
      case 'WITH_MAINTAINERS':
        return row.round
          ? words(`Round ${row.round} is sent · waiting for the maintainers`, 'Open', `Sent ${on}`)
          : words('Pull request open · waiting for a maintainer', 'Open', `Opened ${on.replace(/^on /, '')}`);
      case 'MERGED':
        return words(`Merged ${on}`, 'Open');
      case 'CLOSED':
        return words(`Closed without merging ${on}`, 'Open');
      case 'STOPPED':
        return words(row.number === null ? 'Stopped before a pull request' : `GitRanks work stopped ${on}`, 'Open');
      case 'DISCARDED':
        return words(
          row.number === null ? 'You discarded this fix before a pull request' : 'You discarded this fix',
          'Open',
        );
      default:
        return words('Open it to see where it stands', 'Open');
    }
  })();
  const agentNamed = AGENT_AT_WORK.includes(row.box);
  return {
    ...shown,
    agent: agentNamed ? null : row.agent?.trim() || (hosted ? 'Hosted agent' : null),
    cost: row.costUsd !== null ? costOf(row.costUsd) : null,
  };
}

/** The line about the limit at the top of the list. */
export function limitLineOf(list: Pick<PullRequestList, 'open' | 'limit' | 'atLimit'>): string {
  return list.atLimit
    ? `${list.open} of ${list.limit} open: no new fix can start until one is merged or closed.`
    : `${list.open} of ${list.limit} open at a time`;
}

/** The list's one box when the person has no fix at all, by the bar they came from. */
export const EMPTY_LIST: Record<'learn' | 'contribute', { title: string; text: string; button: string }> = {
  learn: {
    title: 'No pull request yet',
    text: 'A fix starts from an issue: your agent fixes it, you answer a few questions about the fix, then you send the pull request.',
    button: 'See the issues for you',
  },
  contribute: {
    title: 'No pull request yet',
    text: 'A fix starts from an issue: your agent fixes it, you read the change, then you send the pull request.',
    button: 'Find an issue',
  },
};
