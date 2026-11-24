import type { Route } from 'next';

import { SUBMIT_STEP_TEXT, type Tone } from './attempt-format';
import type {
  ContributeNeedsYouFacts,
  ContributeNeedsYouItem,
  ContributeNeedsYouProgress,
  ContributePrSignalKind,
} from './contribute.types';
import { FOLLOW_UP_STEP_LABELS, type FollowUpStep, shortSha } from './follow-up-flow';
import { repoOutTextOf, silentTextOf } from './follow-up-format';
import { maskedKey, relativeLabel, timeLeftLabel, usd } from './format';
import { closingWordsOf, replyWordsOf } from './needs-you-replies';
import { KEY_REPLACE_PATH, pullRequestByAttemptPath, WORKSPACE_PATHS } from './paths';
import { PR_FIX_WORDS } from './pr-conventions';
import { clipped, pushDetailOf, shortLeftOf } from './pr-moves';
import { askedForOf } from './proof';

/**
 * The words of the API's "Needs you" (`contributeNeedsYou`): the API says what needs the user and what to do, and this
 * says it: each item's pill, its one sentence ("Your move: …", or what a run at work does), its button's label and
 * address, and its small second action. It reads the item's `facts` alone, never a second list. Pure.
 */

/** Every kind of an item, as the page names them: the counted ones, then the work in progress. */
export type NeedsYouItemKind =
  | 'key'
  | 'grant'
  | 'autopilot'
  | 'run-autopilot'
  | 'review'
  | 'own-review'
  | 'lesson-ready'
  | 'lesson-blocked'
  | 'lesson-passed'
  | 'lesson-failed'
  | 'run-ready'
  | 'replies'
  | 'reply-failed'
  | 'changes'
  | 'comment'
  | 'check'
  | 'conversation'
  | 'check-yours'
  | 'agreement'
  | 'cla'
  | 'title'
  | 'description'
  | 'changelog'
  | 'proof'
  | 'proof-review'
  | 'proof-failed'
  | 'bot'
  | 'push-failed'
  | 'run-stopped'
  | 'run-found'
  | 'dco'
  | 'repo-out'
  | 'silent'
  | 'fix-failed'
  | 'other'
  | 'attempt-queued'
  | 'attempt-working'
  | 'attempt-submitting'
  | 'working'
  | 'own-working'
  | 'pushed'
  | 'signing-off'
  | 'proof-working'
  | 'proof-posted';

/** An item as the page reads it: its kind as the spec names it (`run-ready`), its side `contribute` or `learn`. */
export type NeedsYouEntry = Omit<ContributeNeedsYouItem, 'kind' | 'side'> & {
  kind: NeedsYouItemKind | (string & {});
  side: 'contribute' | 'learn';
};

/** The API's item as the page reads it: `RUN_READY` → `run-ready`, `LEARN` → `learn`. */
export const needsYouEntryOf = (item: ContributeNeedsYouItem): NeedsYouEntry => ({
  ...item,
  kind: item.kind.toLowerCase().replace(/_/g, '-'),
  side: item.side === 'LEARN' ? 'learn' : 'contribute',
});

/** The row's button: a page of ours, or GitHub (`copy`: text put on the clipboard first, the comment to post). */
export type NeedsYouButton =
  | { label: string; href: Route; aria: string }
  | { label: string; external: string; copy: string | null; aria: string };

/** The row's small second action: a page of ours, or "I've done it" (the signals of `kinds` marked handled). */
export type NeedsYouSecondAction =
  | { label: string; href: Route }
  | { label: string; handled: { prId: string; prNumber: number; kinds: ContributePrSignalKind[]; all: boolean } };

/** What a row says: its pill, its one sentence, its button and its small second action. */
export type NeedsYouWords = {
  tone: Tone;
  pill: string;
  /** "Your move: …" for a counted item, what is under way for one in progress. Untrusted parts are plain text. */
  move: string;
  /** Null while nothing is the user's to press (a sign-off being sent). */
  action: NeedsYouButton | null;
  secondary: NeedsYouSecondAction | null;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** How long the user's own agent's first attempt waits in review: its claim lapses then. */
const OWN_REVIEW_HOURS = 48;

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** A sentence's end: one full stop, none doubled. */
const sentence = (text: string) => {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.NaN;
};

/** " It waits 3 more days." for a hosted review, by when the API ends it; 7 days when that is not known. */
function reviewWaitOf(facts: ContributeNeedsYouFacts, now: Date): string {
  const ends = timeOf(facts.waitEndsAt);
  const daysLeft = Number.isFinite(ends) ? Math.ceil((ends - now.getTime()) / DAY) : null;
  return daysLeft !== null && daysLeft >= 1 && daysLeft < 7
    ? `It waits ${plural(daysLeft, 'more day')}.`
    : 'It waits 7 days.';
}

/** " It waits 48 hours." for the user's own agent's review, or how many hours are left; nothing once it is up. */
function ownWaitOf(facts: ContributeNeedsYouFacts, now: Date): string {
  const ends = timeOf(facts.waitEndsAt);
  if (!Number.isFinite(ends)) return '';
  const hoursLeft = Math.ceil((ends - now.getTime()) / HOUR);
  if (hoursLeft < 1) return '';
  return hoursLeft >= OWN_REVIEW_HOURS
    ? ` It waits ${OWN_REVIEW_HOURS} hours.`
    : ` It waits ${plural(hoursLeft, 'more hour')}.`;
}

/** "Run 2 fixed 3 comments and drafted 2 replies. Approve to push and post.", or what its checks say. */
function runReadyMoveOf(facts: ContributeNeedsYouFacts): string {
  const { round, fixed, skipped, drafts } = facts;
  const name = round ? `Run ${round}` : 'The run';
  if (facts.checkStatus === 'FAILED' || facts.checkStatus === 'NOT_RUN') {
    return `${name}'s tests did not pass: push anyway or discard it.`;
  }
  if (facts.checkStatus === 'BLOCKED') {
    return `Our checks block ${round ? `run ${round}` : 'the run'}'s push: discard it and start ${round ? `run ${round + 1}` : 'another'} with a note.`;
  }
  const did = [
    fixed ? `fixed ${plural(fixed, 'comment')}` : null,
    drafts ? `drafted ${plural(drafts, 'reply', 'replies')}` : null,
  ]
    .filter(Boolean)
    .join(' and ');
  const approve = !drafts
    ? 'Approve to push it.'
    : !fixed && !skipped
      ? 'Approve to post.'
      : 'Approve to push and post.';
  return did ? `${name} ${did}. ${approve}` : `${name} is ready. ${approve}`;
}

/** Who asks a rule, to open its row: `fallback` with the repo's file that asks it. */
function ruleSourceOf(facts: ContributeNeedsYouFacts, kind: string, fallback: string): string {
  const label = facts.ruleSources.find((source) => source.kind === kind)?.label.trim();
  return label ? `${fallback} (in its ${clipped(label, 80)})` : fallback;
}

/** A review bot's block as its detail tells it: `clawsweeper: Blocked before merge …`. */
function verdictOf(detail: string | null): { by: string | null; verdict: string } {
  const text = (detail ?? '').trim();
  const at = text.indexOf(': ');
  return at > 0 ? { by: text.slice(0, at), verdict: text.slice(at + 2) } : { by: null, verdict: text };
}

/** "Starting", "Reading comments", "Pushing": the step a follow-up under way is on. */
function runStepWordsOf(step: string | null | undefined): string {
  const value = (step ?? '').toLowerCase();
  if (value in FOLLOW_UP_STEP_LABELS) return FOLLOW_UP_STEP_LABELS[value as FollowUpStep];
  if (value === 'starting') return 'Starting';
  if (value === 'pushing') return 'Pushing';
  return 'Working';
}

/** An in-progress first attempt's line: its submission's step, the user's own agent, or when it started and its spend. */
function attemptProgressOf(entry: NeedsYouEntry, progress: ContributeNeedsYouProgress | null, now: Date): string {
  if (!progress) return 'Under way.';
  if (entry.kind === 'attempt-submitting' && progress.submitStep) {
    const wait =
      progress.submitStep === 'WAITING_CAP' && progress.waitUntil
        ? ` It goes on ${relativeLabel(progress.waitUntil, now)}.`
        : '';
    return `${SUBMIT_STEP_TEXT[progress.submitStep]}${wait}`;
  }
  if (entry.runner === 'MCP') {
    // The user's own agent holds the issue on a lease while it works; before that it is checking it on GitHub.
    if (entry.kind === 'attempt-working' && !progress.leaseUntil) {
      return 'Your own agent claimed it: checking the issue on GitHub.';
    }
    const agent = progress.agentName ?? 'Your own agent';
    const left = timeLeftLabel(progress.leaseUntil, now);
    const held = left ? ` · held for it for another ${left}` : '';
    const asked = progress.changesRequested ? ' · sent back with your note' : '';
    return `${agent} is on it${held}${asked}`;
  }
  const started = relativeLabel(progress.startedAt, now);
  const spend =
    typeof progress.costUsd === 'number' && typeof progress.budgetUsd === 'number'
      ? ` · ${usd(progress.costUsd)} of ${usd(progress.budgetUsd)}`
      : '';
  return `Started ${started}${spend}`;
}

/** `kelp-db/kelp, pull request #1419` or `…, issue #871`: what a button's name says it is about. */
function whereOf(entry: NeedsYouEntry): string {
  const repo = entry.repo || 'a repo';
  if (entry.pullRequest) return `${repo}, pull request #${entry.pullRequest.number}`;
  return entry.issueNumber ? `${repo}, issue #${entry.issueNumber}` : repo;
}

/** The address of the item's button, from the API's action: a page by attempt, GitHub, or the Agent tab. */
export function buttonOf(entry: NeedsYouEntry, label: string): NeedsYouButton | null {
  const { action } = entry;
  if (!action) return null;
  const aria = `${label.replace(/ ↗$/, '')} on ${whereOf(entry)}`;
  if (action.kind === 'GITHUB' && action.url) {
    return { label: `${label} ↗`, external: action.url, copy: action.copy, aria: `${aria} (opens GitHub)` };
  }
  if (action.kind === 'AGENT') {
    return { label, href: action.target === 'CONNECT' ? WORKSPACE_PATHS.agentConnect : KEY_REPLACE_PATH, aria };
  }
  const move: Record<string, string> = action.move ? { move: action.move } : {};
  // A run's own page: the address by attempt finds its first attempt (replies on a pull request the list does not hold
  // come with the run alone).
  if (action.view === 'RUN') {
    const run = entry.sessionAttemptId ?? entry.attemptId;
    return run ? { label, href: pullRequestByAttemptPath(run, { query: move }), aria } : null;
  }
  const first = entry.attemptId;
  if (!first) return null;
  switch (action.view) {
    case 'LESSON':
      return { label, href: pullRequestByAttemptPath(first, { view: 'lesson' }), aria };
    case 'NEXT':
      return { label, href: pullRequestByAttemptPath(first, { query: { session: 'next', ...move } }), aria };
    default:
      return { label, href: pullRequestByAttemptPath(first, { query: move }), aria };
  }
}

/** The item's small second action, labelled by what it marks handled. */
function secondaryOf(entry: NeedsYouEntry, label: string): NeedsYouSecondAction | null {
  const { secondary } = entry;
  if (!secondary) return null;
  if (secondary.kind === 'AGENT') return { label: 'Connect your own agent', href: WORKSPACE_PATHS.agentConnect };
  if (!secondary.prId || !secondary.prNumber) return null;
  return {
    label,
    handled: {
      prId: secondary.prId,
      prNumber: secondary.prNumber,
      kinds: secondary.signalKinds ?? [],
      all: secondary.all === true,
    },
  };
}

type Said = { tone: Tone; pill: string; move: string; label: string; done?: string };

/** The words of a counted item: by its kind, from its facts. */
function countedOf(entry: NeedsYouEntry, now: Date): Said | null {
  const { facts, detail } = entry;
  const learn = entry.side === 'learn';
  // A pull request the own agent made (a Learn one always): that agent makes its changes, never a run of ours.
  const ownAgent = learn || entry.runner === 'MCP';
  const pr = entry.pullRequest?.number;
  const run = facts.nextRound ? `run ${facts.nextRound}` : 'a run';
  const noRunWhy = facts.byHand ? 'a pull request you opened yourself' : 'a pull request in a repo that said no';
  const left = shortLeftOf(entry.autosubmitAt, now);
  const when = relativeLabel(entry.autosubmitAt, now);
  switch (entry.kind) {
    case 'key':
      return {
        tone: 'red',
        pill: 'Key refused',
        move: 'Anthropic refused your Claude key, so no run can start. Connect a working key.',
        label: 'Connect a new key',
      };
    case 'grant':
      return {
        tone: 'amber',
        pill: 'GitHub access',
        move: 'Allow GitHub access so the pull request opens under your account.',
        label: 'Allow GitHub access',
      };
    case 'autopilot':
      return {
        tone: 'amber',
        pill: left ? `Autopilot · ${left}` : 'Autopilot',
        move: when
          ? `Autopilot opens this pull request ${when}. Check it, or stop it.`
          : 'Autopilot emails you first, then opens this pull request an hour later. Check it, or stop it.',
        label: 'Check before it submits',
      };
    case 'run-autopilot': {
      const name = facts.round ? `run ${facts.round}` : 'the run';
      return {
        tone: 'amber',
        pill: left ? `Autopilot · ${left}` : 'Autopilot',
        move: `Autopilot pushes ${name} ${when || 'soon'}. Check it, or stop it.`,
        label: 'Check before it pushes',
      };
    }
    case 'review':
      return {
        tone: 'violet',
        pill: 'Ready for review',
        move: `This pull request opens only when you approve it. Check the change, then open it or discard it. ${reviewWaitOf(facts, now)}`,
        label: 'Review the change',
      };
    case 'own-review':
      return {
        tone: 'violet',
        pill: 'Ready for review',
        move: `Your agent made this. Approve it or send it back with a note.${ownWaitOf(facts, now)}`,
        label: 'Review the change',
      };
    case 'lesson-ready':
      return {
        tone: 'violet',
        pill: 'Lesson ready',
        move: `Your lesson is ready. Pass it, and the pull request opens.${ownWaitOf(facts, now)}`,
        label: 'Take the lesson',
      };
    case 'lesson-blocked':
      return {
        tone: 'amber',
        pill: 'Lesson needs fixing',
        move: `Some of your lesson's questions need fixing. Send it back to your agent, and it writes them again.${ownWaitOf(facts, now)}`,
        label: 'Send it back',
      };
    case 'lesson-passed':
      return {
        tone: 'violet',
        pill: 'Lesson passed',
        move: `You passed the lesson. Read the pull request, then submit it.${ownWaitOf(facts, now)}`,
        label: 'Submit pull request',
      };
    case 'lesson-failed': {
      const note = facts.submitError?.note?.trim();
      return {
        tone: 'red',
        pill: 'Not opened',
        move: `The pull request did not open${note ? `: ${sentence(clipped(note, 200))}` : '.'} See what to do, then try again.`,
        label: 'Try again',
      };
    }
    case 'run-ready': {
      const name = facts.round ? `run ${facts.round}` : 'the run';
      return learn
        ? {
            tone: 'violet',
            pill: facts.round ? `Change ${facts.round} ready` : 'Change ready',
            move: 'Your agent made the change. Read what changed, then push it.',
            label: 'Read what changed',
          }
        : {
            tone: 'violet',
            pill: facts.round ? `Run ${facts.round} ready` : 'Run ready',
            move: runReadyMoveOf(facts),
            label: `Review ${name}`,
          };
    }
    case 'replies':
      return {
        tone: 'amber',
        pill: 'Replies to approve',
        move: `${facts.round ? `Run ${facts.round}` : 'A run'} drafted ${plural(facts.drafts, 'reply', 'replies')} to ${facts.draftsTo ?? 'the maintainers'}. Read and post them.`,
        label: facts.drafts === 1 ? 'Approve the reply' : 'Approve replies',
      };
    case 'reply-failed': {
      const words = replyWordsOf({
        trouble: facts.replyTrouble ?? 'retry-one',
        count: Math.max(1, facts.drafts),
        note: detail,
        org: entry.repo?.split('/')[0] || 'the organization',
      });
      const closing = closingWordsOf(facts.replyRest);
      return { ...words, move: closing ? `${words.move} ${closing}` : words.move };
    }
    case 'changes':
      if (ownAgent && !facts.noRun) {
        return {
          tone: 'amber',
          pill: 'Changes requested',
          move: 'A maintainer asked for a change. Your agent makes it; you read it and push.',
          label: 'See what they asked',
        };
      }
      return {
        tone: 'amber',
        pill: 'Changes requested',
        move: facts.noRun
          ? `A reviewer asked for changes. Make them on GitHub: no run adds to ${noRunWhy}.`
          : `A reviewer asked for changes. Start ${run} on them.`,
        label: facts.noRun ? 'Open the pull request' : `Start ${run}`,
        done: "I've done it",
      };
    case 'comment':
      if (ownAgent && !facts.noRun) {
        return {
          tone: 'amber',
          pill: 'New comment',
          move: 'Someone commented on it. Your agent answers it; you read it and push.',
          label: 'See what they asked',
        };
      }
      return {
        tone: 'amber',
        pill: 'New comment',
        move: facts.noRun
          ? 'Someone commented on it. Reply on GitHub.'
          : `Someone commented on it. Let ${run} answer, or reply on GitHub.`,
        label: facts.noRun ? 'Reply on GitHub' : `Answer with ${run}`,
        done: "I've replied",
      };
    case 'check': {
      const names = clipped(facts.checks.length ? facts.checks.join(', ') : detail?.trim() || 'A check', 80);
      const fails = facts.checks.length > 1 || names.includes(', ') ? 'fail' : 'fails';
      if (ownAgent && !facts.noRun) {
        return {
          tone: 'red',
          pill: 'Check failing',
          move: `${names} ${fails} on your pull request. Your agent fixes it; you read it and push.`,
          label: 'See what they asked',
        };
      }
      return {
        tone: 'red',
        pill: 'Check failing',
        move: facts.noRun
          ? `${names} ${fails} on your pull request. Fix it on your branch.`
          : `${names} ${fails} on your pull request. Start ${run} to fix it.`,
        label: facts.noRun ? 'Open the pull request' : `Fix with ${run}`,
        done: "I've fixed it",
      };
    }
    case 'conversation':
      return {
        tone: 'amber',
        pill: 'Conversation comment',
        move: "Someone commented in the pull request's conversation. Read it, and reply on GitHub if it asks for one.",
        label: 'See the comment',
        done: "I've replied",
      };
    case 'check-yours': {
      const todo = detail?.trim();
      return {
        tone: 'amber',
        pill: 'Check only you can clear',
        move: todo ? sentence(clipped(todo, 300)) : 'A failing check is yours to clear: no run can. See it on GitHub.',
        label: 'Open the pull request',
        done: "I've done it",
      };
    }
    case 'agreement': {
      const agreement = facts.agreement?.kind === 'DCO' ? 'DCO' : 'CLA';
      const comment = facts.agreement?.signComment?.trim() ?? '';
      return {
        tone: 'amber',
        pill: 'Agreement to sign',
        move: `Only you can sign the repo's ${agreement}; its bot records it from this comment on PR #${pr ?? ''}, word for word: "${clipped(comment, 300)}"`,
        label: entry.action?.kind === 'GITHUB' ? 'Copy and open the PR' : 'See the comment',
        done: 'I posted it',
      };
    }
    case 'cla': {
      const agreement = facts.agreement?.kind === 'DCO' ? 'DCO' : 'CLA';
      const check = facts.agreement?.check?.trim() || detail?.trim();
      return {
        tone: 'amber',
        pill: `${agreement} to sign`,
        move: `The repo merges code only from people who signed its ${agreement}${
          check ? ` (its check: ${clipped(check, 80)})` : ''
        }, and only you can sign it. Sign it on its page; this clears once the check passes.`,
        label: `Sign the ${agreement}`,
        done: 'I signed it',
      };
    }
    case 'title':
      return {
        tone: 'amber',
        pill: 'Title rule',
        move: `${ruleSourceOf(facts, 'TITLE', 'The repo sets a rule for pull request titles')}, and this one breaks it. ${
          facts.ruleIssues.includes('TITLE') ? 'Fix it in one click.' : 'Retitle the pull request on GitHub.'
        }`,
        label: 'Fix the title',
      };
    case 'description': {
      const yours = !facts.templateCheck;
      return {
        tone: 'amber',
        pill: 'Description rule',
        move: yours
          ? `${ruleSourceOf(facts, 'TEMPLATE', "The repo's rules")} say the person who tested the change fills in the description, so the agent left it empty. Open it for what to write and tick, section by section.`
          : `The repo's "${facts.templateCheck}" check fails on the description. Edit it on the rules card, with the check's own words beside it.`,
        label: yours ? 'Fill in the description' : 'Fix the description',
      };
    }
    case 'changelog':
      return {
        tone: 'amber',
        pill: 'Changelog rule',
        move: `${ruleSourceOf(facts, 'CHANGELOG', 'The repo wants a changelog line for each pull request')}, and this one is missing or off. Fix it in one click.`,
        label: 'Fix the changelog',
      };
    case 'proof':
    case 'proof-review':
    case 'proof-failed':
      return proofOf(entry);
    case 'bot': {
      const { by, verdict } = verdictOf(detail);
      return {
        tone: 'amber',
        pill: 'Bot blocks merge',
        move: `${by ?? 'A review bot'} holds the merge until you do what it asks: "${clipped(verdict || 'Blocked before merge', 120)}" Read what it asks.`,
        label: 'See what it asks',
      };
    }
    case 'push-failed':
    case 'run-stopped':
    case 'run-found': {
      const name = facts.round ? `Run ${facts.round}` : 'The last run';
      const said = entry.kind === 'push-failed' ? pushDetailOf(detail) : detail?.trim();
      const why = said ? clipped(said, 200) : null;
      if (ownAgent && !facts.noRun && (entry.kind === 'push-failed' || entry.kind === 'run-stopped')) {
        return {
          tone: 'red',
          pill:
            entry.kind === 'push-failed'
              ? facts.round
                ? `Run ${facts.round} not pushed`
                : 'Push failed'
              : facts.round
                ? `Run ${facts.round} stopped`
                : 'Run stopped',
          move: `${entry.kind === 'push-failed' ? `${name}'s commits could not be pushed` : `${name} stopped`}${why ? `: ${sentence(why)}` : '.'} Ask your agent to pick it up again, or handle it yourself.`,
          label: 'See what to do',
        };
      }
      if (entry.kind === 'push-failed') {
        return {
          tone: 'red',
          pill: facts.round ? `Run ${facts.round} not pushed` : 'Push failed',
          move: `${name}'s commits could not be pushed${why ? `: ${sentence(why)}` : '.'} Start ${run} to make the change again on the pull request as it is now.`,
          label: `Try ${run}`,
        };
      }
      if (entry.kind === 'run-stopped') {
        return {
          tone: 'red',
          pill: facts.round ? `Run ${facts.round} stopped` : 'Run stopped',
          move: `${name} stopped${why ? `: ${sentence(why)}` : '.'} Start ${run}, or handle it yourself.`,
          label: `Try ${run}`,
        };
      }
      return {
        tone: 'amber',
        pill: 'Only you can do this',
        move: `${name} changed nothing: ${why ? sentence(why) : 'what is left is yours to do.'}`,
        label: 'See what to do',
      };
    }
    case 'dco':
      return {
        tone: 'red',
        pill: 'Sign-off missing',
        move: facts.byHand
          ? 'The repo needs your Signed-off-by on every commit, and only you can certify it. See how to add it; the code stays the same.'
          : 'The repo needs your Signed-off-by on every commit, and only you can certify it. One click adds it; the code stays the same.',
        label: facts.byHand ? 'See how to sign off' : 'Sign off and push',
      };
    case 'repo-out': {
      const reason =
        facts.outReason === 'closed_no_ai' || facts.outReason === 'hostile_close' || facts.outReason === 'pr_misses'
          ? facts.outReason
          : null;
      return {
        tone: 'amber',
        pill: 'Repo out of Contribute',
        move: `${repoOutTextOf(reason)} ${
          reason === 'pr_misses'
            ? 'Close it on GitHub if you no longer want it, or click Keep it open.'
            : 'Close it on GitHub, or click Keep it open.'
        }`,
        label: 'See your options',
        done: 'Keep it open',
      };
    }
    case 'silent':
      return {
        tone: 'amber',
        pill: 'No answer in 30 days',
        move: `${silentTextOf(detail)} Click Keep it open to keep it, or close it yourself on GitHub.`,
        label: 'See your options',
        done: 'Keep it open',
      };
    case 'fix-failed': {
      const fix = facts.fix;
      const what = fix && fix.kind in PR_FIX_WORDS ? PR_FIX_WORDS[fix.kind as keyof typeof PR_FIX_WORDS] : 'A fix';
      const note = fix?.note?.trim() ? `: ${sentence(clipped(fix.note, 160))}` : '.';
      return {
        tone: 'red',
        pill: 'A fix failed',
        move: `${what} did not go through${note} ${
          fix?.kind === 'SIGN_OFF'
            ? 'Try again, or sign off by hand: git rebase --signoff HEAD~N (N: the commits on the pull request), then git push --force-with-lease.'
            : 'Try again, or make the change on GitHub.'
        }`,
        label: 'See what happened',
      };
    }
    case 'other':
      if (ownAgent && !facts.noRun) {
        return {
          tone: 'amber',
          pill: 'Something changed',
          move: 'Something changed on it. Your agent looks at it; you read it and push.',
          label: 'See what changed',
        };
      }
      return {
        tone: 'amber',
        pill: 'Something changed',
        move: facts.noRun
          ? 'Something changed on it. See what on GitHub.'
          : `Something changed on it. Start ${run} to look at it, or see what on GitHub.`,
        label: facts.noRun ? 'Open the pull request' : `Start ${run}`,
      };
    default:
      return null;
  }
}

/** A review bot's ask for proof, as its row says it: the ask itself, the proof back for the user, a post that failed. */
function proofOf(entry: NeedsYouEntry): Said {
  const { facts } = entry;
  const bot = facts.proofBot ?? verdictOf(entry.detail).by ?? 'The review bot';
  switch (facts.proofStage) {
    case 'review':
    case 'cannot':
    case 'fix-broken':
    case 'unreadable':
      return {
        tone: 'amber',
        pill: 'Check the proof',
        move:
          facts.proofStage === 'review'
            ? `Your agent captured the proof ${bot} asks for. Check it, then post it.`
            : facts.proofStage === 'cannot'
              ? "Your agent couldn't capture the proof. Read why, and the reply it drafted."
              : facts.proofStage === 'fix-broken'
                ? "Your agent found the fix doesn't work. Read what it saw."
                : "Your agent's proof can't be shown here. Send it back, or discard it.",
        label: facts.proofStage === 'review' ? 'Check the proof' : 'Read it',
      };
    case 'failed':
      return {
        tone: 'red',
        pill: 'Posting failed',
        move: 'Posting the proof failed; its page says why. Try again, or discard it.',
        label: 'See what failed',
      };
    case 'posted':
      return {
        tone: 'violet',
        pill: 'Bot reads it',
        move: `Proof posted. ${bot} reads it again; this leaves once it lets the merge through.`,
        label: 'See the proof',
      };
    case 'working':
    case 'posting':
      return {
        tone: 'violet',
        pill: facts.proofStage === 'posting' ? 'Posting the proof' : 'Your agent',
        move:
          facts.proofStage === 'posting'
            ? 'GitRanks is posting the proof you checked.'
            : 'Your own agent is capturing the proof on your machine.',
        label: 'See the proof',
      };
    default:
      return {
        tone: 'amber',
        pill: 'Proof needed',
        move: `${bot} asks for ${askedForOf(facts.proofAsks ?? 'proof')}. Your own agent can capture it on your machine.`,
        label: 'Get the proof',
      };
  }
}

/** The words of an item in progress: a first attempt under way, a run at work, a push being read, a proof at work. */
function inProgressOf(entry: NeedsYouEntry, now: Date): Said | null {
  const { facts, progress } = entry;
  const round = facts.round;
  const name = round ? `run ${round}` : 'the run';
  switch (entry.kind) {
    case 'attempt-queued':
      return { tone: 'neutral', pill: 'Queued', move: attemptProgressOf(entry, progress, now), label: 'Details' };
    case 'attempt-working':
      return { tone: 'violet', pill: 'Agent working', move: attemptProgressOf(entry, progress, now), label: 'Details' };
    case 'attempt-submitting':
      return { tone: 'violet', pill: 'Submitting', move: attemptProgressOf(entry, progress, now), label: 'Details' };
    case 'working': {
      const step = progress?.runStep?.toLowerCase();
      const started = progress?.startedAt ? relativeLabel(progress.startedAt, now) : '';
      return {
        tone: 'violet',
        pill: round ? `Run ${round} working` : 'Run working',
        move:
          step === 'pushing'
            ? 'Pushing the commits you approved.'
            : step
              ? `${runStepWordsOf(step)}${started ? ` · started ${started}` : ''}. It comes back here when it is ready.`
              : 'Under way. It comes back here when it is ready.',
        label: `Watch ${name}`,
      };
    }
    case 'own-working': {
      const left = timeLeftLabel(progress?.leaseUntil, now);
      return {
        tone: 'violet',
        pill: round ? `Run ${round} with your agent` : 'Run with your agent',
        move: left ? `Your agent holds it for another ${left}.` : 'Your agent is on it.',
        label: `Watch ${name}`,
      };
    }
    case 'pushed': {
      const sha = shortSha(progress?.pushedSha);
      return {
        tone: 'violet',
        pill: round ? `Run ${round} pushed` : 'Run pushed',
        move: `Pushed${sha ? ` ${sha}` : ''} · reading the pull request again.`,
        label: entry.sessionAttemptId ? `Watch ${name}` : 'See the pull request',
      };
    }
    case 'signing-off':
      return { tone: 'violet', pill: 'Signing off', move: 'Rewriting the commits with your sign-off.', label: '' };
    case 'proof-working':
    case 'proof-posted':
      return proofOf(entry);
    default:
      return null;
  }
}

/**
 * What a row says, by its kind and facts. A kind this page does not know yet still says something, and its button
 * leads to the pull request's page.
 */
export function needsYouWordsOf(entry: NeedsYouEntry, now: Date): NeedsYouWords {
  const said: Said = (entry.working ? inProgressOf(entry, now) : countedOf(entry, now)) ?? {
    tone: 'amber',
    pill: entry.working ? 'Under way' : 'Something changed',
    move: entry.working ? 'Under way.' : 'Something waits on it. See what on its page.',
    label: entry.working ? 'Details' : 'See what to do',
  };
  return {
    tone: said.tone,
    pill: said.pill,
    move: said.move,
    action: said.label ? buttonOf(entry, said.label) : null,
    secondary: secondaryOf(entry, said.done ?? "I've done it"),
  };
}

/** The key's line in place of the chips: "Claude key …k3Qa". */
export const keyWhereOf = (entry: NeedsYouEntry): string | null =>
  entry.kind === 'key' ? `Claude key${entry.facts.lastFour ? ` ${maskedKey(entry.facts.lastFour)}` : ''}` : null;
