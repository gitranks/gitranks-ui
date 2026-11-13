import { AutosubmitCountdown, RetryButton, StopAutopilotButton } from './follow-up-buttons';
import { CardError, DiscardAttemptButton, OpenFormButton, RepoRulesLink, SendBack } from './head-actions';
import { MoveCard } from './move-card';
import type { CardProps } from './move-props';
import { Button } from '@/components/ui/button';
import {
  checkLimitOf,
  endReasonTextOf,
  githubUrlOf,
  limitNoteOf,
  noGoReasonOf,
  ranOutCapOf,
  timeLabel,
} from '@/lib/contribute/attempt-format';
import type { ContributeAttemptDetail, ContributeAutopilotReviewReason } from '@/lib/contribute/contribute.types';
import { shownByDecisions } from '@/lib/contribute/decisions';
import { forkSyncUrlOf } from '@/lib/contribute/fork-sync';
import type { OrgAccess } from '@/lib/contribute/org-access';
import { type BounceWords, settledStepsOf } from '@/lib/contribute/session-status';

/** Why autopilot left it for the user's review instead of submitting it; nothing for an ordinary review. */
export const AUTOPILOT_REVIEW_NOTES: Partial<
  Record<ContributeAutopilotReviewReason, (source: string | null) => string>
> = {
  no_email: () => 'Autopilot did not submit it: we have no email to tell you first, so it waits for your review.',
  notice_late: () => 'Autopilot did not submit it: we could not email you first, so it waits for your review.',
  autopilot_off: () => 'Autopilot did not submit it: autopilot was turned off or locked before it did.',
  override: () => 'You chose to work on this one, so you approve its pull request.',
  beginner_issue: (source) =>
    `Autopilot did not submit it: it never submits on beginner issues${source ? ` (${source})` : ''}, so it waits for your review.`,
  issue_unread: () =>
    'Autopilot did not submit it: we could not read the issue to check its labels, so it waits for your review.',
  repo_manual_only: (source) =>
    `Autopilot did not submit it: this repository asks for a person’s review${source ? ` (${source})` : ''}.`,
};

const BIG = 'min-h-11 px-4 font-semibold';

/** A link out as an outline button beside the card's main one. */
export function OutlineLink({ href, children, data }: { href: string; children: string; data?: string }) {
  return (
    <Button asChild size="lg" variant="outline" className={BIG}>
      <a href={href} target="_blank" rel="noopener noreferrer" data-link={data}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  );
}

/** Where the user asks the organization to approve the app, as an outline button. */
export function OrgAccessButton({ access }: { access: OrgAccess }) {
  return (
    <Button asChild size="lg" variant="outline" className={BIG}>
      <a href={access.url} target="_blank" rel="noopener noreferrer" data-org-access={access.app ? 'app' : 'apps'}>
        Request access for the organization ↗<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  );
}

/** "It waits 7 more days for you", from when the review became ready. */
function waitsOf(attempt: ContributeAttemptDetail, now: Date): string {
  const since = Date.parse(attempt.reviewAt ?? attempt.updatedAt);
  if (!Number.isFinite(since)) return '7 more days';
  const days = Math.ceil((since + 7 * 86_400_000 - now.getTime()) / 86_400_000);
  return days >= 1 && days < 7 ? `${days} more ${days === 1 ? 'day' : 'days'}` : '7 more days';
}

/** The review's one sentence: what the agent did, with its risk and checks when known. */
function reviewWhyOf(attempt: ContributeAttemptDetail, now: Date): string {
  const low = attempt.result?.risk === 'LOW';
  const passed = attempt.checksPassed === true;
  if (!low && !passed) return 'Read the change, then submit it as your pull request or discard it.';
  return `The agent fixed it${low ? ' with low risk' : ''}${passed ? ' and every check passed' : ''}. It waits ${waitsOf(attempt, now)} for you.`;
}

/** The secondary a submit that came back offers beside Try again: the fork, the org, or the repo's rules. */
function BounceLink({
  bounce,
  attempt,
  access,
}: {
  bounce: BounceWords;
  attempt: ContributeAttemptDetail;
  access: OrgAccess;
}) {
  const submit = attempt.submit;
  const fork = submit?.fork;
  switch (bounce.secondary) {
    case 'org-access':
      return <OrgAccessButton access={access} />;
    case 'fork-sync': {
      const href = forkSyncUrlOf(submit?.lastError?.reason, fork ?? null, submit?.syncBranch ?? null);
      return href ? (
        <OutlineLink href={href} data="fork-sync">
          Open your fork on GitHub ↗
        </OutlineLink>
      ) : null;
    }
    case 'fork-page': {
      const href = fork ? githubUrlOf(`https://github.com/${fork}`) : null;
      return href ? <OutlineLink href={href}>Open your fork on GitHub ↗</OutlineLink> : null;
    }
    case 'fork-branches': {
      const href = fork ? githubUrlOf(`https://github.com/${fork}/branches`) : null;
      return href ? <OutlineLink href={href}>Open your fork's branches ↗</OutlineLink> : null;
    }
    case 'repo-rules':
      return <RepoRulesLink />;
    default:
      return null;
  }
}

/** The submit's details: its steps as they settled, the full note and when. */
function BounceDetails({ attempt, more }: { attempt: ContributeAttemptDetail; more?: string | null }) {
  const submit = attempt.submit;
  const error = submit?.lastError;
  if (!submit || !error) return null;
  return (
    <>
      <p className="font-mono text-xs">{settledStepsOf(submit)}</p>
      <p>
        {error.note || 'The last step did not go through.'} ({timeLabel(error.at)})
      </p>
      {more ? <p>{more}</p> : null}
    </>
  );
}

/** The first attempt in review: the change to check, then the pull request to write (M6), or Discard. */
export function ReviewCard({ move, first, now, orgAccess, rider }: CardProps) {
  if (!first || (move.data.card !== 'review' && move.data.card !== 'own-review')) return null;
  const bounce = move.data.bounce;
  const own = move.data.card === 'own-review';
  const left = first.sendBacksLeft ?? 0;
  const ownWhy = 'Check it, then open the pull request or send it back with a note.';
  const why = bounce ? (
    <>
      <p>{bounce.why}</p>
      {own ? <p>{ownWhy}</p> : null}
      {own && left <= 0 ? <p>It was sent back as many times as it can be.</p> : null}
    </>
  ) : own ? (
    <>
      <p>{ownWhy}</p>
      {left <= 0 ? <p>It was sent back as many times as it can be.</p> : null}
    </>
  ) : (
    <p>{reviewWhyOf(first, now)}</p>
  );
  const reason = first.reviewReason;
  const note = reason && Object.hasOwn(AUTOPILOT_REVIEW_NOTES, reason) ? AUTOPILOT_REVIEW_NOTES[reason] : undefined;
  return (
    <MoveCard
      id={move.kinds[0]}
      name={move.card}
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={why}
      primary={
        bounce ? (
          bounce.tryAgain ? (
            <OpenFormButton label="Try again" focus="submit" />
          ) : null
        ) : (
          <OpenFormButton label="Write the pull request" />
        )
      }
      secondary={
        <>
          {bounce ? <BounceLink bounce={bounce} attempt={first} access={orgAccess} /> : null}
          {own ? <SendBack left={left} /> : null}
          <DiscardAttemptButton />
        </>
      }
      error={<CardError sources={['discard-attempt', 'submit', 'send-back']} />}
      whyLabel={bounce ? 'Details' : "Why autopilot didn't submit it"}
      whyBody={
        bounce ? (
          <BounceDetails attempt={first} more={bounce.more} />
        ) : note ? (
          <p data-autopilot-review-reason={reason ?? ''}>{note(first.reviewReasonSource ?? null)}</p>
        ) : null
      }
      rider={rider}
    />
  );
}

/** The submit asked for GitHub access: the form's own button gives it, then the pull request opens. */
export function GrantCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'grant' || move.data.run) return null;
  const revoked = move.data.reason.trim().toLowerCase() === 'grant_revoked';
  const error = first.submit?.lastError;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="grant"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={
        <p>
          {revoked
            ? 'GitHub says the access you gave GitRanks was revoked.'
            : 'The pull request opens under your GitHub account, and GitRanks has no access to it yet.'}
        </p>
      }
      primary={<OpenFormButton label="Allow GitHub access" focus="submit" />}
      secondary={<DiscardAttemptButton />}
      error={<CardError sources={['discard-attempt', 'submit']} />}
      whyLabel="Details"
      whyBody={
        error ? (
          <p data-submit-error={error.reason}>
            {error.note} ({timeLabel(error.at)})
          </p>
        ) : null
      }
      rider={rider}
    />
  );
}

/** Autopilot opens the pull request at its hour unless the user stops it to review it first. */
export function AutopilotCard({ move, first, now, rider }: CardProps) {
  if (!first || move.data.card !== 'autopilot') return null;
  const at = first.autosubmitAt;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="autopilot"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={
        <p>
          {at === undefined
            ? 'When it submits, and stopping it, are not available yet.'
            : at === null
              ? 'Emailing you first. The hour starts once the email is sent.'
              : 'Every check passed and the risk is low. Stop it to review the change yourself first.'}
        </p>
      }
      body={
        at ? (
          <p className="text-sm">
            <AutosubmitCountdown at={at} from={now.toISOString()} />
          </p>
        ) : null
      }
      primary={at === undefined ? null : <StopAutopilotButton attemptId={first.attemptId} />}
      rider={rider}
    />
  );
}

/** A stopped first attempt GitRanks can try again once: a bigger check budget, or work on it anyway. */
export function RetryCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'retry' || !first.retry) return null;
  const limit = checkLimitOf(first);
  const shown = shownByDecisions(first);
  const boost = move.data.retry === 'BOOST';
  const { amount } = ranOutCapOf(first.endDetail);
  const why = boost
    ? `${
        limit?.limit === 'time'
          ? amount
            ? `The check ran out of its ${amount} time limit before it decided.`
            : 'The check ran out of its time limit before it decided.'
          : amount
            ? `The check ran out of its ${amount} budget before it decided.`
            : 'The check ran out of its budget before it decided.'
      } Once, the agent checks again with twice the budget and time.`
    : 'The agent said no-go. You can overrule it once; you then approve its pull request yourself.';
  const detail =
    !shown.noGoDetail && first.endDetail && !(limit && !limit.decided) ? noGoReasonOf(first.endDetail) : null;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="retry"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p>{why}</p>}
      body={<RetryButton attemptId={first.attemptId} retry={first.retry} release={first.goNoGo?.release} />}
      whyBody={
        <>
          <p>{endReasonTextOf(first) ?? 'Why it stopped is not available yet.'}</p>
          {detail ? <p>Its reason: {detail}</p> : null}
          {limit?.decided && !shown.limitNote ? <p>{limitNoteOf(limit)}</p> : null}
          <p>If you leave it, nothing waits on you: the issue went back to the pool.</p>
        </>
      }
      rider={rider}
    />
  );
}
