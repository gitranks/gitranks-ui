import type { Route } from 'next';

import { githubUrlOf } from './attempt-format';
import { BLOCKED_WALKTHROUGH_WORDS, type WalkthroughSendBack } from './blocked-walkthrough';
import type {
  PullRequestBox,
  PullRequestCheckClass,
  PullRequestChecks,
  PullRequestOnlyYou,
  PullRequestOutcome,
  PullRequestPage,
  PullRequestRound,
  PullRequestRoundAsk,
  PullRequestRoundCloser,
  PullRequestRoundNotNeeded,
  PullRequestRoundState,
  PullRequestStage,
} from './pull-request-page.types';

/**
 * The words of a pull request's page, for Learn and Contribute: the strip, the box and its one action, the two cards,
 * the rounds and the checks. One place, so the parts and their specs read the same sentences.
 */

export const STAGE_WORDS: Record<PullRequestStage, string> = {
  FIX: 'Fix',
  WALKTHROUGH: 'Walkthrough',
  APPROVE: 'Approve',
  REVIEW: 'Review',
  MERGED: 'Merged',
};

/** The ends: the box keeps the strip and offers one way on. */
const ENDS: readonly PullRequestBox[] = ['CLOSED', 'STOPPED', 'DISCARDED'];

/** The pull request ended without a merge. */
export const isQuietEnd = (box: PullRequestBox) => ENDS.includes(box);

/**
 * A stage of the strip: done (a check), the current one (its number, a ring that turns while work goes on), the one
 * an ended pull request stopped at (grey), or still to come.
 */
export type StripStep = {
  stage: PullRequestStage;
  n: number;
  label: string;
  state: 'done' | 'current' | 'stopped' | 'todo';
  working: boolean;
};

export function stripOf(page: Pick<PullRequestPage, 'stages' | 'stage' | 'box' | 'working'>): StripStep[] {
  const at = page.stages.indexOf(page.stage);
  return page.stages.map((stage, index) => {
    const state =
      page.box === 'MERGED' || index < at ? 'done' : index > at ? 'todo' : isQuietEnd(page.box) ? 'stopped' : 'current';
    return { stage, n: index + 1, label: STAGE_WORDS[stage], state, working: state === 'current' && page.working };
  });
}

/** `today`, or `on 21 Nov`, in UTC. */
export function onDayOf(iso: string | null | undefined, now: Date): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const day = (value: Date) => value.toISOString().slice(0, 10);
  if (day(date) === day(now)) return 'today';
  return `on ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The first letter as a capital. */
const sentence = (text: string) => (text ? `${text[0].toUpperCase()}${text.slice(1)}` : text);

/** `a, b and c`. */
const listOf = (parts: string[]) =>
  parts.length < 2 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/** A review that asks for changes, a comment of a person, a bot's comments, a check that fails. */
const REVIEW = 'changes_requested';
const PERSON_COMMENTS = new Set(['comment', 'conversation']);
const CHECK = 'check_failed';

type Tally = { reviews: number; comments: number; checks: number; other: number; bots: Map<string, number> };

function tallyOf(asked: readonly PullRequestRoundAsk[]): Tally {
  const tally: Tally = { reviews: 0, comments: 0, checks: 0, other: 0, bots: new Map() };
  for (const ask of asked) {
    if (ask.kind === CHECK) tally.checks += 1;
    else if (ask.bot) tally.bots.set(ask.author, (tally.bots.get(ask.author) ?? 0) + (ask.comments ?? 1));
    else if (ask.kind === REVIEW) tally.reviews += 1;
    else if (PERSON_COMMENTS.has(ask.kind)) tally.comments += 1;
    else tally.other += 1;
  }
  return tally;
}

/** What a round was asked, as one line: "A review asking for changes, 1 comment, 5 from CodeRabbit, 1 failing check". */
export function askedSummaryOf(asked: readonly PullRequestRoundAsk[]): string {
  const tally = tallyOf(asked);
  const parts = [
    tally.reviews
      ? tally.reviews === 1
        ? 'a review asking for changes'
        : `${tally.reviews} reviews asking for changes`
      : '',
    tally.comments ? count(tally.comments, 'comment') : '',
    ...[...tally.bots].map(([bot, n]) => `${n} from ${bot}`),
    tally.checks ? count(tally.checks, 'failing check') : '',
    tally.other ? count(tally.other, 'other request') : '',
  ].filter(Boolean);
  return sentence(parts.join(', '));
}

/** The box's title while a round waits: "Round 2: a review, a comment and 1 failing check to answer". */
export function roundAskTitleOf(round: Pick<PullRequestRound, 'n' | 'asked'>): string {
  const tally = tallyOf(round.asked);
  const parts = [
    tally.reviews ? (tally.reviews === 1 ? 'a review' : `${tally.reviews} reviews`) : '',
    tally.comments ? (tally.comments === 1 ? 'a comment' : `${tally.comments} comments`) : '',
    ...[...tally.bots].map(([bot, n]) => `${n} from ${bot}`),
    tally.checks ? count(tally.checks, 'failing check') : '',
    tally.other ? count(tally.other, 'other request') : '',
  ].filter(Boolean);
  return parts.length ? `Round ${round.n}: ${listOf(parts)} to answer` : `Round ${round.n} has something to answer`;
}

/** The replies a round's send posts: every one the person did not leave out. */
export const repliesSentOf = (round: Pick<PullRequestRound, 'replies'>) =>
  round.replies.filter((reply) => !reply.leftOut).length;

/** "2 commits and 10 replies": what a round sends, or sent; '' when nothing. */
export function sendsOf(round: Pick<PullRequestRound, 'commits' | 'replies'>): string {
  const commits = round.commits ?? 0;
  const replies = repliesSentOf(round);
  return listOf(
    [commits ? count(commits, 'commit') : '', replies ? count(replies, 'reply', 'replies') : ''].filter(Boolean),
  );
}

/** The button that sends a round as a whole; it counts only what will be posted: "Send round 2: 2 commits and 10 replies". */
export function sendRoundLabelOf(round: Pick<PullRequestRound, 'n' | 'commits' | 'replies'>): string {
  const sends = sendsOf(round);
  return sends ? `Send round ${round.n}: ${sends}` : `Send round ${round.n}`;
}

/** A round's mark in the list of rounds. */
export const ROUND_STATE_WORDS: Record<PullRequestRoundState, string> = {
  WAITING: 'To answer',
  WORKING: 'Your agent is on it',
  READY: 'Ready for you',
  SENT: 'Done',
  NOT_NEEDED: 'Not needed',
};

/** A sent round's mark: the last one sent waits for the maintainers until the pull request moves on. */
export function sentRoundMarkOf(
  round: Pick<PullRequestRound, 'n'>,
  page: Pick<PullRequestPage, 'box' | 'rounds'>,
): string {
  const newest = Math.max(...page.rounds.map((each) => each.n));
  if (round.n !== newest) return ROUND_STATE_WORDS.SENT;
  if (page.box === 'MERGED') return 'Merged';
  if (page.box === 'WITH_MAINTAINERS') return 'With the maintainers';
  return ROUND_STATE_WORDS.SENT;
}

/** The reasons a round is not needed, in the order the question asks them. */
export const NOT_NEEDED_REASONS: { reason: PullRequestRoundNotNeeded; text: string }[] = [
  { reason: 'FAILS_ON_BASE', text: 'The checks fail on the main branch too' },
  { reason: 'ASKS_NOTHING', text: 'The comment asks for nothing' },
  { reason: 'ALREADY_ANSWERED', text: 'It is already answered' },
  { reason: 'BOT_IS_WRONG', text: 'A bot is wrong' },
  { reason: 'OTHER', text: 'Something else' },
];

/**
 * Who closed a round that is not needed, and why: "You marked it as not needed: the checks fail on the main branch
 * too.", or "Not needed any more." when GitRanks closed it itself (its ask went away, or the pull request ended). An
 * older API does not say who: the person, as before.
 */
export function notNeededLineOf(
  reason: PullRequestRoundNotNeeded | null,
  closedBy?: PullRequestRoundCloser | null,
): string {
  if (closedBy === 'GITRANKS') return 'Not needed any more.';
  const text = NOT_NEEDED_REASONS.find((each) => each.reason === reason)?.text;
  return text
    ? `You marked it as not needed: ${text[0].toLowerCase()}${text.slice(1)}.`
    : 'You marked it as not needed.';
}

/** A round that is open: it waits, works or is ready. */
export const isOpenRound = (round: Pick<PullRequestRound, 'state'>) =>
  round.state === 'WAITING' || round.state === 'WORKING' || round.state === 'READY';

/** The boxes of a pull request that ended: merged, or a quiet end. */
const ENDED: readonly PullRequestBox[] = ['MERGED', ...ENDS];

/** A round marked as not needed opens again only while its pull request is open and no other round is. */
export const reopensRounds = (page: Pick<PullRequestPage, 'box' | 'rounds'>) =>
  !ENDED.includes(page.box) && !page.rounds.some(isOpenRound);

export const CHECK_CLASS_WORDS: Record<PullRequestCheckClass, string> = {
  AGENT_CAN_FIX: 'Your agent can fix',
  NEEDS_YOU: 'Needs you',
  NOT_YOURS: 'Not yours to fix',
};

export type CheckChip = { key: 'pass' | PullRequestCheckClass; text: string };

/** The checks line: four counts, each left out when it is zero or not known. */
export function checkChipsOf(checks: PullRequestChecks): CheckChip[] {
  const chips: [CheckChip['key'], number | null, string][] = [
    ['pass', checks.pass, 'pass'],
    ['AGENT_CAN_FIX', checks.agentCanFix, 'your agent can fix'],
    ['NEEDS_YOU', checks.needsYou, 'needs you'],
    ['NOT_YOURS', checks.notYours, 'not yours to fix'],
  ];
  return chips.flatMap(([key, n, words]) => (n ? [{ key, text: `${n} ${words}` }] : []));
}

/** A card under the box: its words, its link, and whether it is drawn quiet (empty yet). */
export type CardWords = { text: string; link: boolean; quiet: boolean };

/** The card "The change". */
export function changeCardOf(page: Pick<PullRequestPage, 'change' | 'box'>): CardWords {
  const change = page.change;
  if (!change?.files) {
    return {
      text: page.box === 'DISCARDED' || page.box === 'STOPPED' ? 'No change.' : 'Not written yet.',
      link: false,
      quiet: true,
    };
  }
  return {
    text: `${count(change.files, 'file')} changed: ${count(change.added, 'line')} added, ${change.removed} removed.`,
    link: true,
    quiet: false,
  };
}

/** The card "The walkthrough", for a Learn fix. */
export function walkthroughCardOf(page: Pick<PullRequestPage, 'walkthrough' | 'box' | 'number'>, now: Date): CardWords {
  const card = page.walkthrough;
  if (page.box === 'WRITING_WALKTHROUGH' || page.box === 'REWRITING_WALKTHROUGH') {
    return { text: 'Being written.', link: false, quiet: true };
  }
  if (!card?.questions) {
    const ended = page.box === 'DISCARDED' || page.box === 'STOPPED';
    return { text: ended ? 'No walkthrough.' : 'Written after the fix.', link: false, quiet: true };
  }
  if (card.passedAt) {
    const passed = onDayOf(card.passedAt, now);
    if (page.number === null) {
      return {
        text: `${sentence(`passed ${passed}`)}. Private until the pull request opens.`,
        link: true,
        quiet: false,
      };
    }
    const readers = card.readers ? ` ${count(card.readers, 'person', 'people')} read it.` : '';
    const shared = card.shared ? ' Your answers are shared.' : ' Your answers are not shared.';
    return { text: `${sentence(`passed ${passed}`)}.${readers}${shared}`, link: true, quiet: false };
  }
  if (card.answered) {
    return { text: `${card.answered} of ${count(card.questions, 'question')} answered.`, link: false, quiet: false };
  }
  return { text: `${count(card.questions, 'question')}, not started.`, link: false, quiet: false };
}

/** What the box offers: a link the page gives, a press the page hears, or GitHub's page in a new tab. */
export type BoxActionId =
  | 'walkthrough'
  | 'approve'
  | 'lessonQuestions'
  | 'lessonIssues'
  | 'course'
  | 'similar'
  | 'issues'
  | 'startRound'
  | 'sendRound'
  | 'sendBack'
  | 'retry'
  | 'veto'
  | 'onlyYou'
  | 'onlyYouAlt'
  | 'github';

export type BoxAction = { id: BoxActionId; label: string; url?: string | null };

/**
 * The box: its title, a line under it, an optional quiet note in the actions' place, and its actions, the first one the
 * main action. `prompt`: the round's prompt to copy, in the actions' place. `quiet`: an end without a merge, drawn
 * grey and dashed.
 */
export type BoxWords = {
  title: string;
  text: string;
  /** A link at the end of the text: the pull request on GitHub. */
  textLink?: { label: string; url: string } | null;
  note?: string | null;
  prompt?: string | null;
  actions: BoxAction[];
  quiet: boolean;
};

/** The parts of opening a pull request, in plain words. */
export const OPENING_STEPS = [
  'waiting for its turn',
  'copying the project',
  'bringing it up to date',
  'sending your change to GitHub',
  'opening the pull request',
] as const;

/** "Step 3 of 5 · bringing it up to date"; the step held to 1 to 5. */
export function openingStepOf(step: number | null): { step: number; of: number; line: string } {
  const of = OPENING_STEPS.length;
  const at = Math.min(of, Math.max(1, Math.round(step ?? 1)));
  return { step: at, of, line: `Step ${at} of ${of} · ${OPENING_STEPS[at - 1]}` };
}

/** The words of something only the person can do, by its kind: the box's title, its action and the second one. */
type OnlyYouWords = { title: string; action: string | null; alt?: string; external: boolean; short: string };

const ONLY_YOU: Record<string, OnlyYouWords> = {
  cla: {
    title: 'Sign the project’s agreement',
    action: 'Sign it',
    external: true,
    short: 'Sign it',
  },
  dco: {
    title: 'Sign off your commits',
    action: 'Sign off and push',
    alt: 'Do it by hand',
    external: false,
    short: 'Sign off and push',
  },
  co_author: {
    title: 'Add the co-author line',
    action: 'Add it and push',
    external: false,
    short: 'Add it and push',
  },
  conversation: {
    title: 'A person asked you something',
    action: 'Answer on GitHub',
    external: true,
    short: 'Answer on GitHub',
  },
  title: {
    title: 'The title does not follow the project’s rule',
    action: 'Rename it',
    external: false,
    short: 'Rename it',
  },
  github: {
    title: 'Allow GitHub access',
    action: 'Allow GitHub access',
    external: false,
    short: 'Allow GitHub access',
  },
  check_yours: {
    title: 'A check needs you',
    action: 'See it on GitHub',
    external: true,
    short: 'See it on GitHub',
  },
  bot_blocked: {
    title: 'A bot asks for proof that the fix works',
    action: 'Prove it',
    external: false,
    short: 'Prove it',
  },
  replies_failed: {
    title: 'Replies did not post',
    action: 'Post them as one comment',
    alt: 'Try again',
    external: false,
    short: 'Post them as one comment',
  },
};

/**
 * The address an item only the person can do leads to, when it is safe to open: GitHub's own pages, or for a CLA (signed
 * on the service the project chose) any `https:` page. Null otherwise: the item then has no link.
 */
export function onlyYouUrlOf(item: Pick<PullRequestOnlyYou, 'kind' | 'url'>): string | null {
  if (item.kind !== 'cla') return githubUrlOf(item.url);
  try {
    return item.url && new URL(item.url).protocol === 'https:' ? item.url : null;
  } catch {
    return null;
  }
}

/** The words of an item only the person can do; a kind this UI does not know gets GitHub's page, when it has one. */
export function onlyYouWordsOf(item: Pick<PullRequestOnlyYou, 'kind' | 'url'>): OnlyYouWords {
  return (
    ONLY_YOU[item.kind] ?? {
      title: 'Only you can do this',
      action: githubUrlOf(item.url) ? 'See it on GitHub' : null,
      external: true,
      short: 'See it on GitHub',
    }
  );
}

/** One line under the box about what became of the pull request. */
export const OUTCOME_WORDS: Record<PullRequestOutcome, string> = {
  SILENT: 'The maintainers have not answered for a while. That happens often, and it needs nothing from you.',
  REPO_OUT: 'This project asked GitRanks to stop: we post nothing more here. You can go on by hand on GitHub.',
};

/** A link to the pull request on GitHub, only when the address is GitHub's own. */
const githubLinkOf = (url: string | null, label: string) => {
  const safe = githubUrlOf(url);
  return safe ? { label, url: safe } : null;
};

/** Who works: the agent's name when the page knows it, the hosted agent, or "your agent". */
const agentOf = (page: Pick<PullRequestPage, 'hosted'>, agent: string | null | undefined) =>
  agent?.trim() || (page.hosted ? 'The hosted agent' : 'Your agent');

const NOTHING_NEEDED = 'Nothing is needed from you. This page moves on by itself.';

/** The ways on after a pull request opened or merged: the lesson's, or a similar issue's. */
function waysOn(page: Pick<PullRequestPage, 'made' | 'lesson' | 'lessonToAsk'>): BoxAction[] {
  if (page.made === 'LEARN' && page.lesson) {
    return [
      ...(page.lessonToAsk ? [{ id: 'lessonQuestions' as const, label: 'Learn the lesson it used' }] : []),
      { id: 'lessonIssues', label: 'Another issue on this lesson' },
      { id: 'course', label: 'Back to your course' },
    ];
  }
  return [
    { id: 'similar', label: 'Fix a similar issue' },
    { id: 'issues', label: 'Back to Issues' },
  ];
}

/** The round the box is about, or the newest: the box's words and its button both read this one. */
export function roundOf(page: Pick<PullRequestPage, 'round' | 'rounds'>): PullRequestRound | null {
  return (
    (page.round !== null ? page.rounds.find((each) => each.n === page.round) : null) ??
    [...page.rounds].sort((a, b) => b.n - a.n)[0] ??
    null
  );
}

/** The number of the round the box is about: its words and its button's press both use it. */
export const boxRoundOf = (page: Pick<PullRequestPage, 'round' | 'rounds'>) => roundOf(page)?.n ?? page.round ?? 1;

/** The round's own button, "Start round N", is Contribute's hosted agent's; Learn's rounds are the person's agent's. */
export const startsRounds = (page: Pick<PullRequestPage, 'made' | 'hosted'>) => page.hosted && page.made !== 'LEARN';

/** Rounds that count toward "Merged after N rounds": a round marked as not needed was never answered. */
export const answeredRoundsOf = (page: Pick<PullRequestPage, 'rounds'>) =>
  page.rounds.filter((round) => round.state !== 'NOT_NEEDED').length;

/**
 * The box's words for the page's state. `agent`: the agent's name when known ("Claude Code"); `stoppedAtLimit`: a
 * hosted round stopped at the person's limit; `walkthroughBlocked`: a walkthrough of an older version that waits for
 * another pass by the person's agent, with its reason line. The part leaves out an action the page gives it no link or
 * press for.
 */
export function boxOf(
  page: PullRequestPage,
  {
    agent,
    now,
    stoppedAtLimit = false,
    walkthroughBlocked = null,
  }: {
    agent?: string | null;
    now: Date;
    stoppedAtLimit?: boolean;
    walkthroughBlocked?: { reason: string | null; sendBack?: WalkthroughSendBack } | null;
  },
): BoxWords {
  const who = agentOf(page, agent);
  const learn = page.made === 'LEARN';
  const round = roundOf(page);
  const n = boxRoundOf(page);
  const card = page.walkthrough;
  const base = { quiet: false, actions: [] as BoxAction[] };
  switch (page.box) {
    case 'FIXING':
      return {
        ...base,
        title: `${who} is fixing the issue`,
        text: learn
          ? 'When the fix is ready, it writes a few questions about it: the walkthrough.'
          : 'When the change is ready, you read it and send the pull request.',
        note: page.hosted
          ? NOTHING_NEEDED
          : `Nothing is needed from you. You can close this page: your agent tells you when the ${learn ? 'walkthrough' : 'change'} is ready.`,
      };
    case 'WRITING_WALKTHROUGH':
      return {
        ...base,
        title: `The fix is ready. ${who} is writing its walkthrough`,
        text: 'The walkthrough is a few questions about this change. It usually takes a minute or two.',
        note: NOTHING_NEEDED,
      };
    case 'REWRITING_WALKTHROUGH':
      return {
        ...base,
        title: `${who} is rewriting the walkthrough`,
        text: 'It was sent back, so you never see a question with a mistake in it. It usually takes a minute or two.',
        note: NOTHING_NEEDED,
      };
    case 'WALKTHROUGH': {
      if (walkthroughBlocked) {
        // Only what is true: the send-back when one is left, else why not.
        const sendBack = walkthroughBlocked.sendBack ?? 'yes';
        const what =
          sendBack === 'yes'
            ? BLOCKED_WALKTHROUGH_WORDS.text
            : sendBack === 'none-left'
              ? BLOCKED_WALKTHROUGH_WORDS.noneLeftText
              : BLOCKED_WALKTHROUGH_WORDS.noSendBackText;
        return {
          ...base,
          title: BLOCKED_WALKTHROUGH_WORDS.line,
          text: walkthroughBlocked.reason ? `${walkthroughBlocked.reason} ${what}` : what,
          actions: sendBack === 'yes' ? [{ id: 'sendBack', label: BLOCKED_WALKTHROUGH_WORDS.button }] : [],
        };
      }
      const questions = card?.questions ? count(card.questions, 'question') : 'the questions';
      const after = 'After them, the pull request is yours to approve.';
      const text = card?.answered
        ? `You answered ${card.answered} of ${card.questions}. ${after}`
        : `They are about this change only. ${after}`;
      return {
        ...base,
        title: `Answer ${questions} about the fix`,
        text,
        actions: [{ id: 'walkthrough', label: card?.answered ? 'Continue the walkthrough' : 'Start the walkthrough' }],
      };
    }
    case 'APPROVE': {
      const passed = learn && card?.passedAt ? `You finished the walkthrough ${onDayOf(card.passedAt, now)}. ` : '';
      return {
        ...base,
        title: 'Read the change and open the pull request',
        text: `${passed}Nothing has reached GitHub yet: the pull request opens in your name when you send it.`,
        actions: [{ id: 'approve', label: 'Write the pull request' }],
      };
    }
    case 'OPENING':
      return {
        ...base,
        title: 'Opening your pull request',
        text: 'You can stay or leave: this page moves on by itself.',
        // Only while autopilot is about to send it: the page gives the press then.
        actions: [{ id: 'veto', label: 'Don’t send it' }],
      };
    case 'OPEN':
      return {
        ...base,
        title: 'Your pull request is open',
        text: 'Now the maintainers read it. We keep reading the pull request and bring you back when something needs you.',
        actions: waysOn(page),
      };
    case 'ONLY_YOU': {
      const item = page.onlyYou[0];
      if (!item) {
        return { ...base, title: 'Only you can do this', text: 'Something on the pull request waits for you.' };
      }
      const words = onlyYouWordsOf(item);
      return {
        ...base,
        title: words.title,
        text: item.text,
        actions: [
          ...(words.action
            ? [{ id: 'onlyYou' as const, label: words.action, url: words.external ? onlyYouUrlOf(item) : null }]
            : []),
          ...(words.alt ? [{ id: 'onlyYouAlt' as const, label: words.alt, url: null }] : []),
        ],
      };
    }
    case 'ROUND_WAITING': {
      const starts = startsRounds(page);
      return {
        ...base,
        title: round ? roundAskTitleOf(round) : `Round ${n} has something to answer`,
        text: starts
          ? 'Your agent reads them, changes the code and drafts the replies. Nothing is sent before you approve the round.'
          : `Paste this in ${agent?.trim() || 'your agent'}. Your agent changes the code and drafts the replies; nothing is sent before you approve the round.`,
        prompt: starts ? null : (round?.prompt ?? null),
        actions: starts ? [{ id: 'startRound', label: `Start round ${n}` }] : [],
      };
    }
    case 'ROUND_WORKING':
      return {
        ...base,
        title: `${who} is working on round ${n}`,
        text: 'It changes the code and drafts the replies. Nothing is sent before you approve the round.',
        note: NOTHING_NEEDED,
      };
    case 'ROUND_READY': {
      const commits = round?.commits ?? 0;
      const drafted = round?.replies.length ?? 0;
      const left = drafted - (round ? repliesSentOf(round) : 0);
      const did = listOf(
        [
          commits ? `made ${count(commits, 'commit')}` : '',
          drafted ? `drafted ${count(drafted, 'reply', 'replies')}` : '',
        ].filter(Boolean),
      );
      return {
        ...base,
        title: `Round ${n} is ready: read it, then send it`,
        text: `Your agent ${did || 'finished'}${left ? `, and you left ${left} out` : ''}. Open the round to read it, edit a reply or leave one out. Nothing has reached GitHub yet.`,
        actions: [
          { id: 'sendRound', label: round ? sendRoundLabelOf(round) : `Send round ${n}` },
          { id: 'sendBack', label: 'Send it back to your agent' },
        ],
      };
    }
    case 'WITH_MAINTAINERS': {
      const sent = page.rounds.filter((each) => each.state === 'SENT').sort((a, b) => b.n - a.n)[0];
      // Learn's ways on while the maintainers read: the lesson's, each shown when the page gives its address.
      const ways: BoxAction[] =
        learn && page.lesson
          ? [
              { id: 'lessonQuestions', label: 'Learn the lesson it used' },
              { id: 'lessonIssues', label: 'Another issue on this lesson' },
              { id: 'course', label: 'Back to your course' },
            ]
          : [];
      const words: BoxWords = sent
        ? {
            ...base,
            title: `Round ${sent.n} is sent. Waiting for the maintainers`,
            text: `Your agent’s answer went to the same pull request ${onDayOf(sent.sentAt, now)}. We keep reading it and bring you back when something needs you.`,
            note: 'Nothing is needed from you.',
          }
        : {
            ...base,
            title: 'Waiting for the maintainers',
            text: 'We keep reading the pull request and bring you back when something needs you.',
            note: 'Nothing is needed from you.',
          };
      return { ...words, actions: ways };
    }
    case 'MERGED': {
      const answered = answeredRoundsOf(page);
      const after = answered > 1 ? ` after ${answered} rounds` : '';
      return {
        ...base,
        title: `Merged${after}. Your code is in ${page.repo}`,
        text: learn
          ? 'It counts toward your contribution stars, and the walkthrough of this fix is public.'
          : 'It counts toward your contribution stars.',
        actions: waysOn(page),
      };
    }
    case 'CLOSED':
      return {
        ...base,
        quiet: true,
        title: 'Closed without merging',
        text:
          learn && card?.passedAt
            ? 'The pull request was closed without a merge. The walkthrough you finished stays in your progress.'
            : 'The pull request was closed without a merge.',
        textLink: githubLinkOf(page.url, 'See it on GitHub'),
        actions: [{ id: 'issues', label: 'Back to Issues' }],
      };
    case 'STOPPED':
      if (page.number !== null && stoppedAtLimit) {
        return {
          ...base,
          quiet: true,
          title: `Round ${n} stopped at your limit`,
          text: 'Nothing from this round reached GitHub. Try it again, or finish it by hand on the pull request.',
          actions: [
            { id: 'retry', label: 'Try again' },
            { id: 'github', label: 'Finish it by hand on GitHub', url: githubUrlOf(page.url) },
          ],
        };
      }
      return page.number !== null
        ? {
            ...base,
            quiet: true,
            title: 'GitRanks work on this pull request stopped',
            text: 'Your agent will not start another round here, and we post nothing more. The pull request stays open: you can go on by hand on GitHub.',
            textLink: githubLinkOf(page.url, 'Open it on GitHub'),
            actions: [{ id: 'issues', label: 'Back to Issues' }],
          }
        : {
            ...base,
            quiet: true,
            title: `${page.hosted ? 'The hosted agent' : 'The agent'} stopped before a pull request`,
            text: 'Nothing reached GitHub, and it does not count against you.',
            actions: [
              { id: 'retry', label: 'Try again' },
              { id: 'issues', label: 'Back to Issues' },
            ],
          };
    case 'DISCARDED':
      return {
        ...base,
        quiet: true,
        title: 'You discarded this fix',
        text: 'Nothing reached GitHub. The issue went back to the pool.',
        actions: [{ id: 'issues', label: 'Back to Issues' }],
      };
    default:
      return { ...base, title: 'Your pull request', text: 'This page moves on by itself.' };
  }
}

/** Where the box's "Prove it" leads on the page: today's proof card, under the box. */
export const PROOF_ANCHOR = 'proof';

/** "This fix used A stack", or before the fix is written, the lesson it is likely to use. */
export const lessonLeadOf = (page: Pick<PullRequestPage, 'lessonConfirmed'>) =>
  page.lessonConfirmed ? 'This fix used' : 'This fix is likely to use';

/**
 * The addresses a pull request's page gives its parts: the parts build none of their own, so they name neither
 * product's pages. A part leaves out a link it is not given.
 */
export type PullRequestLinks = {
  /** The list of pull requests. */
  back?: Route | null;
  /** The fixer's walkthrough. */
  walkthrough?: Route | null;
  /** Approve and send. */
  approve?: Route | null;
  /** The change, file by file. */
  change?: Route | null;
  /** The person's answers to the walkthrough. */
  answers?: Route | null;
  /** The lesson's page. */
  lesson?: Route | null;
  /** The lesson's own questions, after the pull request is sent. */
  lessonQuestions?: Route | null;
  /** Another issue on the same lesson. */
  lessonIssues?: Route | null;
  /** The lesson's course. */
  course?: Route | null;
  /** An issue like this one. */
  similar?: Route | null;
  /** The issues of the product the person came from. */
  issues?: Route | null;
  /** Contribute: the pull request's title and description. */
  pullRequestText?: Route | null;
};
