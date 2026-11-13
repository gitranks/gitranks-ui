import type { ContributeAttemptDetail, ContributeView } from './contribute.types';
import type { Move, MoveKind, NoRun, RuleItem, SessionRef } from './contribution-moves';
import type { ActionId } from './hard-stop';
import { plural } from './move-cards';
import { type Candidate, candidatesOf, FIXED_BY, type NeedsYouKind } from './needs-you';
import { contributionOf, nextStepOf } from './next-step';
import { agentConnectedOf, type ProofStage } from './proof';
import { waitingThreadsOf } from './sessions';

/**
 * The moves an open pull request's next step and proof hold (2026-11-13), on their cards, in Needs you's order
 * (`candidatesOf`): the next run, an agreement, the rules, the sign-off, what a bot or a run left the user, a stopped
 * run, the repo out of Contribute, silence, the proof. Pure: `contributionMovesOf` puts them among the others.
 */

/** The kinds of the next-run card, in its `?move=` order. */
const RUN_KINDS: MoveKind[] = ['changes', 'comment', 'check', 'other', 'threads', 'run-recommended'];
/** The rules card's kinds, in its `?move=` order. */
const RULE_KINDS: MoveKind[] = ['title', 'description', 'changelog'];
const PROOF_KINDS: MoveKind[] = ['proof', 'proof-review', 'proof-failed'];
const FOUND_KINDS: MoveKind[] = ['bot', 'run-found'];

/** Needs you's pill words, for the PR-level cards' kind lines. */
const PILLS: Partial<Record<MoveKind, string>> = {
  changes: 'Changes requested',
  comment: 'New comment',
  check: 'Check failing',
  other: 'Something changed',
  threads: 'Review comments',
  'run-recommended': 'Recommended',
  replies: 'Replies to approve',
  agreement: 'Agreement to sign',
  title: 'Title rule',
  description: 'Description rule',
  changelog: 'Changelog rule',
  'fix-failed': 'A fix failed',
  bot: 'Bot blocks merge',
  'run-found': 'Only you can do this',
  dco: 'Sign-off missing',
  'repo-out': 'Repo out of Contribute',
  silent: 'No answer in 30 days',
  proof: 'Proof needed',
  'proof-review': 'Check the proof',
  'proof-failed': 'Posting failed',
};

/** A PR move's card, from Needs you's reasons on the open pull request, in their order. */
type PrCard = { slot: number; move: Move };

/**
 * The open pull request's moves the next step and the proof hold, in Needs you's order (`candidatesOf`), each reason
 * on its card: the next run, an agreement, the rules, the sign-off, what a bot or a run left the user, a stopped run,
 * the repo out of Contribute, silence, the proof. `replySlot` marks where the reply moves go.
 */
export function prCardsOf({
  first,
  view,
  now,
  mayStart,
  noRun,
  blocked,
  signingOff,
  round,
}: {
  first: ContributeAttemptDetail;
  view: ContributeView;
  now: Date;
  mayStart: boolean;
  noRun: NoRun | null;
  blocked: ReadonlySet<ActionId>;
  signingOff: boolean;
  round: number;
}): { cards: PrCard[]; replySlot: number } {
  const pr = contributionOf(first);
  if (!pr) return { cards: [], replySlot: 0 };
  const candidates = candidatesOf({ pr, drafts: [], runs: [], now });
  const step = nextStepOf(first, agentConnectedOf(view), now);
  const signals = first.needsYou?.signals ?? [];
  const threads = waitingThreadsOf(first).length;
  const fix = first.prFix ?? null;
  const fixedKind = fix?.state === 'FAILED' ? FIXED_BY[fix.kind] : undefined;
  const kindOf = (candidate: Candidate): NeedsYouKind =>
    candidate.kind === 'fix-failed' && fixedKind ? fixedKind : candidate.kind;
  const present = candidates.map(kindOf);
  const slotOf = (kind: NeedsYouKind) => present.indexOf(kind);
  const cards: PrCard[] = [];
  const next: SessionRef = 'next';
  const nextChip = 'Next step';

  // The reply slot: after the run's reasons Needs you lists first.
  const replySlot =
    (() => {
      const at = present.findIndex((kind) => !['changes', 'comment', 'check'].includes(kind));
      return at < 0 ? present.length : at;
    })() - 0.5;

  // The next run: one card for everything a run would act on.
  const runKinds = (['changes', 'comment', 'check', 'other'] as const).filter((kind) => present.includes(kind));
  const kinds: MoveKind[] = [...runKinds];
  if (mayStart && threads && !kinds.includes('changes') && !kinds.includes('comment')) kinds.push('threads');
  if (mayStart && !kinds.length && first.followUps?.recommended) kinds.push('run-recommended');
  if (kinds.length) {
    const ordered = RUN_KINDS.filter((kind) => kinds.includes(kind));
    const lead = ordered[0];
    const github = !mayStart;
    const slot =
      lead === 'threads'
        ? (slotOf('check') >= 0 ? slotOf('check') : replySlot) - 0.25
        : lead === 'run-recommended'
          ? (slotOf('check') >= 0 ? slotOf('check') : replySlot - 0.5) + 0.1
          : slotOf(lead as NeedsYouKind);
    const runSignals = step.run.signals;
    const check = signals.find(({ kind }) => kind === 'CHECK_FAILED')?.detail?.trim() || 'A check';
    const checks = check.includes(', ') ? 'checks' : 'check';
    const title = github
      ? lead === 'changes'
        ? 'Make the requested changes on GitHub'
        : lead === 'comment'
          ? 'Reply to the new comment on GitHub'
          : lead === 'check'
            ? `Fix ${check} on your branch`
            : 'See what changed on GitHub'
      : lead === 'changes' || lead === 'threads'
        ? threads
          ? addressTitleOf(waitingThreadsOf(first))
          : `Start run ${round} on the requested changes`
        : lead === 'comment'
          ? `Start run ${round} on the new comment`
          : lead === 'check'
            ? `Start run ${round} on the failing ${checks}`
            : lead === 'other'
              ? `Start run ${round} to look at it`
              : `Start run ${round}`;
    cards.push({
      slot,
      move: {
        card: 'next-run',
        kinds: ordered,
        session: next,
        tone: github ? 'amber' : 'violet',
        kindLine: PILLS[lead] ?? 'Next run',
        title,
        chip: nextChip,
        actions: github ? [] : ['start_run'],
        data: {
          card: 'next-run',
          round,
          noRun: github ? (noRun ?? 'stopped') : null,
          signals: runSignals,
          kinds: step.run.kinds,
          threads,
          note: step.run.note,
        },
      },
    });
  }

  // The agreement: a comment that signs it, or a page.
  const agreement = step.user.find((move) => move.kind === 'agreement');
  if (agreement && agreement.kind === 'agreement') {
    const kind: MoveKind = agreement.signComment ? 'agreement' : 'cla';
    cards.push({
      slot: slotOf(kind),
      move: {
        card: 'agreement',
        kinds: [kind],
        session: next,
        tone: 'amber',
        kindLine: agreement.signComment ? 'Agreement to sign' : `${agreement.agreement} to sign`,
        title: agreement.signComment
          ? `Sign the ${agreement.agreement} with a comment`
          : `Sign the ${agreement.agreement}`,
        chip: nextChip,
        actions: [],
        data: { ...agreement, card: 'agreement' },
      },
    });
  }

  // The rules: the title, the description, the changelog, a CLA rule with no CLA signal; a fix that failed in its place.
  const issues = first.prIssues ?? [];
  const hasCla = signals.some(({ kind }) => kind === 'CLA');
  const failedKind = fixedKind && RULE_KINDS.includes(fixedKind) ? fixedKind : null;
  const items: RuleItem[] = [];
  const titleIssue = issues.find(({ kind }) => kind === 'TITLE') ?? null;
  if (titleIssue || signals.some(({ kind }) => kind === 'TITLE')) {
    items.push({ kind: 'title', issue: titleIssue, failed: failedKind === 'title' });
  }
  const template = issues.find(({ kind }) => kind === 'TEMPLATE');
  if (template) items.push({ kind: 'description', issue: template, failed: failedKind === 'description' });
  const changelog = issues.find(({ kind }) => kind === 'CHANGELOG');
  if (changelog) items.push({ kind: 'changelog', issue: changelog, failed: failedKind === 'changelog' });
  const claIssue = !hasCla ? issues.find(({ kind }) => kind === 'CLA') : undefined;
  if (claIssue) items.push({ kind: 'cla', issue: claIssue, failed: false });
  const ruleSending = !!fix && fix.kind !== 'SIGN_OFF' && fix.state === 'SENDING';
  if (items.length) {
    const ruleKinds: MoveKind[] = RULE_KINDS.filter((kind) => items.some((item) => item.kind === kind));
    if (failedKind) ruleKinds.push('fix-failed');
    const claOnly = !ruleKinds.length;
    const ids: MoveKind[] = claOnly ? ['cla'] : ruleKinds;
    const one = items.length === 1 ? items[0] : null;
    const agreementName = first.conventions?.cla?.agreement ?? 'CLA';
    cards.push({
      slot: claOnly
        ? (slotOf('title') >= 0 ? slotOf('title') : replySlot + 0.4) - 0.1
        : slotOf(ruleKinds[0] as NeedsYouKind),
      move: {
        card: 'rules',
        kinds: ids,
        session: next,
        tone: failedKind ? 'red' : 'amber',
        kindLine: claOnly
          ? `${agreementName} to sign`
          : failedKind && ids[0] === failedKind
            ? 'A fix failed'
            : (PILLS[ids[0]] ?? 'Repo rules'),
        title: one
          ? ruleItemTitleOf(one, agreementName)
          : `The pull request breaks ${items.length} of the repo's rules`,
        chip: nextChip,
        actions: ['retitle', 'edit_description', 'fix_changelog', 'fix_link'],
        data: { card: 'rules', items, fix: ruleSending || failedKind ? fix : null },
      },
    });
  }

  // The proof, held by the proof's own session, shown on the next step.
  const proof = step.user.find((move) => move.kind === 'proof');
  if (proof && proof.kind === 'proof') {
    const proofKind: MoveKind | null =
      proof.stage === 'not-connected' || proof.stage === 'connected'
        ? 'proof'
        : proof.stage === 'review' ||
            proof.stage === 'cannot' ||
            proof.stage === 'fix-broken' ||
            proof.stage === 'unreadable'
          ? 'proof-review'
          : proof.stage === 'failed'
            ? 'proof-failed'
            : null;
    const dropped =
      (proof.stage === 'review' && blocked.has('post_proof')) ||
      (proof.stage === 'cannot' && blocked.has('proof_reply')) ||
      (proof.stage === 'fix-broken' && blocked.has('proof_fix')) ||
      (proof.stage === 'failed' && blocked.has('retry_proof'));
    if (proofKind && !dropped) {
      const slot = candidates.findIndex(
        ({ kind }) => PROOF_KINDS.includes(kind) || kind === 'proof-working' || kind === 'proof-posted',
      );
      cards.push({
        slot: slot >= 0 ? slot : replySlot + 0.6,
        move: {
          card: 'proof',
          kinds: [proofKind],
          session: 'proof',
          tone: proof.stage === 'fix-broken' || proof.stage === 'failed' ? 'red' : 'amber',
          kindLine: PILLS[proofKind] ?? 'Proof',
          title: PROOF_TITLES[proof.stage] ?? 'Prove the fix on your machine',
          chip: 'Proof',
          actions: ['post_proof', 'retry_proof', 'proof_reply', 'proof_fix'],
          data: { ...proof, card: 'proof', round, mayStart },
        },
      });
    }
  }

  // What a bot or a run left the user: one card, one "I've done it".
  const found = step.user.find((move) => move.kind === 'found');
  if (found && found.kind === 'found') {
    const foundKinds = FOUND_KINDS.filter((kind) => present.includes(kind as NeedsYouKind));
    if (foundKinds.length) {
      const by = found.bot?.by ?? 'the review bot';
      const runName = found.run?.round ? `run ${found.run.round}` : 'the last run';
      cards.push({
        slot: slotOf(foundKinds[0] as NeedsYouKind),
        move: {
          card: 'found',
          kinds: foundKinds,
          session: next,
          tone: 'amber',
          kindLine: found.bot ? 'Bot blocks merge' : 'Only you can do this',
          title: found.bot ? `Do what ${by} asks` : `What ${runName} left for you`,
          chip: nextChip,
          actions: [],
          data: { ...found, card: 'found' },
        },
      });
    }
  }

  // A run that stopped, or whose commits did not push.
  const stopped = step.user.find((move) => move.kind === 'stopped');
  if (stopped && stopped.kind === 'stopped') {
    const unpushed = stopped.run.outcome === 'push_failed';
    const kind: MoveKind = unpushed ? 'push-failed' : 'run-stopped';
    const name = stopped.run.round ? `Run ${stopped.run.round}` : 'The last run';
    cards.push({
      slot: slotOf(kind),
      move: {
        card: 'stopped',
        kinds: [kind],
        session: next,
        tone: 'red',
        kindLine: unpushed
          ? stopped.run.round
            ? `Run ${stopped.run.round} not pushed`
            : 'Push failed'
          : stopped.run.round
            ? `Run ${stopped.run.round} stopped`
            : 'Run stopped',
        title: unpushed ? `${name}'s commits weren't pushed` : `${name} stopped`,
        chip: nextChip,
        actions: ['start_run'],
        data: { ...stopped, card: 'stopped', round, noRun: mayStart ? null : (noRun ?? 'stopped') },
      },
    });
  }

  // The sign-off: GitRanks signs off and pushes, or the user does it by hand; held back while one is on its way.
  const dcoSignal = signals.some(({ kind }) => kind === 'DCO');
  const signOff = fix?.kind === 'SIGN_OFF' ? fix : null;
  if (dcoSignal && !signingOff) {
    const byHand = first.openedBy === 'HAND' || blocked.has('sign_off');
    const variant = byHand
      ? 'by-hand'
      : signOff?.state === 'FAILED'
        ? 'failed'
        : signOff?.state === 'DONE'
          ? 'sent'
          : 'ours';
    cards.push({
      slot: slotOf('dco'),
      move: {
        card: 'dco',
        kinds: variant === 'failed' ? ['dco', 'fix-failed'] : ['dco'],
        session: next,
        tone: variant === 'failed' ? 'red' : 'amber',
        kindLine: variant === 'failed' ? 'A fix failed' : 'Sign-off missing',
        title: byHand && first.openedBy === 'HAND' ? 'Sign off your commits' : 'Sign off the commits',
        chip: nextChip,
        actions: ['sign_off'],
        data: { card: 'dco', variant, fix: signOff },
      },
    });
  }

  // GitRanks' own: the repo left Contribute, or no answer in 30 days. Closing or keeping the PR is the user's call.
  const out = step.user.find((move) => move.kind === 'repo-out');
  if (out && out.kind === 'repo-out') {
    cards.push({
      slot: slotOf('repo-out'),
      move: {
        card: 'repo-out',
        kinds: ['repo-out'],
        session: next,
        tone: 'amber',
        kindLine: 'Repo out of Contribute',
        title: out.reason === 'pr_misses' ? 'Close or keep the pull request open' : 'The repo left Contribute',
        chip: nextChip,
        actions: [],
        data: { card: 'repo-out', reason: out.reason, at: out.at },
      },
    });
  }
  const silent = step.user.find((move) => move.kind === 'silent');
  if (silent && silent.kind === 'silent') {
    cards.push({
      slot: slotOf('silent'),
      move: {
        card: 'silent',
        kinds: ['silent'],
        session: next,
        tone: 'amber',
        kindLine: 'No answer in 30 days',
        title: 'No answer in 30 days',
        chip: nextChip,
        actions: [],
        data: { card: 'silent', closesOn: silent.closesOn, at: silent.at },
      },
    });
  }
  return { cards, replySlot };
}

/** `a`, `a and b`, `a, b and c`. */
const listed = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');

/**
 * "Address 7 comments from maintainer-mo and coderabbitai": the next-run card's title over the comments it takes; more
 * than three authors, "Address 9 review comments".
 */
export function addressTitleOf(threads: { author: string | null }[]): string {
  const authors = [...new Set(threads.map(({ author }) => author || 'a reviewer'))];
  const count = threads.length;
  if (authors.length > 3) return `Address ${count} review comments`;
  return `Address ${plural(count, 'comment')} from ${listed(authors)}`;
}

/** A rule item's title, as the rules card says it alone or among others. */
export function ruleItemTitleOf(item: RuleItem, agreement = 'CLA'): string {
  switch (item.kind) {
    case 'title':
      return 'Retitle the pull request';
    case 'description':
      return item.issue?.check ? 'Fix the description' : 'Fill in the description on GitHub';
    case 'changelog':
      return 'Fix the changelog line';
    case 'cla':
      return `Sign the ${agreement}`;
  }
}

/** The proof card's title, by its stage. */
export const PROOF_TITLES: Partial<Record<ProofStage, string>> = {
  'not-connected': 'Prove the fix on your machine',
  connected: 'Run the proof prompt in your agent',
  review: 'Check the proof, then post it',
  cannot: "Your agent couldn't capture the proof",
  'fix-broken': "Your agent found the fix doesn't work",
  unreadable: "The proof can't be shown",
  failed: 'Posting the proof failed',
};
