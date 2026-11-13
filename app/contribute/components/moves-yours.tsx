import { SignOffButton } from './follow-up-buttons';
import { CardError, StartRun } from './head-actions';
import { GithubButton, MoveCard, Steps } from './move-card';
import type { CardProps } from './move-props';
import { Handled, prOf } from './moves-pr';
import { timeLabel } from '@/lib/contribute/attempt-format';
import { repoOutTextOf, silentCloseDayOf, silentTextOf } from '@/lib/contribute/follow-up-format';
import { relativeLabel, usd } from '@/lib/contribute/format';
import { clipped } from '@/lib/contribute/needs-you';

/**
 * The next step's cards for what only the user can do on the open pull request: the DCO sign-off, what a review bot
 * or a run left them, a run that stopped or did not push, the repo out of Contribute, no answer in 30 days.
 */

/** The DCO's text, for what signing off certifies. */
const DCO_URL = 'https://developercertificate.org/';

const BY_HAND = [
  'In your clone, check out the pull request’s branch.',
  'Run git rebase --signoff HEAD~N, where N is the number of commits on the pull request (its Commits tab counts them).',
  'Push it with git push --force-with-lease.',
  'The DCO check runs again: this clears once it passes.',
];

/** The DCO sign-off missing on the commits: GitRanks adds it and force-pushes, or the user does it by hand. */
export function DcoCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'dco') return null;
  const { variant, fix } = move.data;
  const repo = first.nameWithOwner || 'This repo';
  const why =
    variant === 'by-hand'
      ? `${repo} requires a Signed-off-by line on every commit, and ${first.openedBy === 'HAND' ? 'yours' : 'ours'} went out without one. Only you can certify it.`
      : variant === 'failed'
        ? `The sign-off didn't go through${fix?.note ? `: ${clipped(fix.note, 200).replace(/[.!?…]+$/, '')}` : ''}.`
        : variant === 'sent'
          ? 'Signed off and pushed. This clears once the DCO check passes.'
          : `${repo} requires a Signed-off-by line, and ours went out without one. GitRanks can add it and force-push.`;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="dco"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p>{why}</p>}
      body={
        variant === 'ours' || variant === 'failed' ? (
          <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-xs text-muted-foreground">GitRanks adds this line to each of our commits</span>
            <code className="font-mono text-[13px] break-words">
              Signed-off-by: your name &lt;your GitHub noreply address&gt;
            </code>
          </div>
        ) : null
      }
      primary={
        variant === 'ours' || variant === 'failed' ? (
          <SignOffButton attemptId={first.attemptId} sending={false} again={variant === 'failed'} />
        ) : null
      }
      secondary={
        variant === 'ours' || variant === 'failed' ? null : (
          <Handled first={first} kinds={['DCO']} label="Mark as handled" />
        )
      }
      whyOpen={variant === 'by-hand'}
      whyLabel={variant === 'by-hand' ? 'What to do' : "I'll do it myself"}
      whyBody={
        <>
          <p>
            The code stays the same; the branch is rewritten (a force-push). Signing off certifies the{' '}
            <a href={DCO_URL} target="_blank" rel="noreferrer" className="text-link">
              Developer Certificate of Origin ↗
            </a>
            .
          </p>
          {variant === 'failed' ? (
            <p className="font-mono text-xs">git rebase --signoff HEAD~N, then git push --force-with-lease</p>
          ) : null}
          <Steps title="Sign off by hand" steps={BY_HAND} />
          {variant === 'ours' || variant === 'failed' ? (
            <Handled first={first} kinds={['DCO']} label="Mark as handled" />
          ) : null}
        </>
      }
      rider={rider}
    />
  );
}

/** "Run 1 · Oct 28, 10:52 UTC · $0.31": when the run ended, and what it cost. */
const findingMetaOf = (run: { round: number | null; at: string; costUsd: number | null }) =>
  [run.round ? `Run ${run.round}` : 'The last run', timeLabel(run.at), run.costUsd ? usd(run.costUsd) : null]
    .filter(Boolean)
    .join(' · ');

/** What a review bot or a run left the user: the verdict, the steps, GitHub, "I've done it". */
export function FoundCard({ move, first, now, rider }: CardProps) {
  if (!first || move.data.card !== 'found') return null;
  const data = move.data;
  const pr = prOf(first);
  const by = data.bot?.by ?? 'the review bot';
  return (
    <MoveCard
      id={move.kinds[0]}
      name="found"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={
        <p>
          {data.bot
            ? `${data.bot.by ?? 'A review bot'} holds the merge until what it asks is done. GitRanks doesn't start a run for a bot's ask.`
            : `${data.run?.round ? `Run ${data.run.round}` : 'The last run'} changed nothing: ${data.run?.detail ? clipped(data.run.detail, 200) : 'the agent found the rest is yours to do.'}`}
        </p>
      }
      body={
        <>
          {data.bot ? (
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm" data-bot-verdict="">
              <span className="font-mono text-xs text-muted-foreground">
                {[data.bot.by, 'blocks the merge', relativeLabel(data.bot.at, now)].filter(Boolean).join(' · ')}
              </span>
              <span className="font-medium break-words">“{clipped(data.bot.verdict, 300)}”</span>
            </div>
          ) : null}
          {data.run ? (
            <p className="font-mono text-xs text-muted-foreground" data-run-finding={data.run.round ?? ''}>
              {findingMetaOf(data.run)}
            </p>
          ) : null}
        </>
      }
      primary={pr.url ? <GithubButton href={pr.url} primary>{`Open #${pr.number} on GitHub ↗`}</GithubButton> : null}
      secondary={<Handled first={first} kinds={data.kinds} label="I've done it" />}
      whyBody={
        <>
          <p>
            {data.bot
              ? `${by} is a review bot on the repo: it holds the merge until what it asks is done. A review bot's ask is left to you: GitRanks does not start a run for it.`
              : 'The agent reads every review, comment and check on the pull request; it changes what code can fix and leaves you what only you can do (a decision, an account, a proof from your machine).'}
          </p>
          <Steps
            steps={[
              `Open PR #${pr.number} on GitHub${data.bot ? ` and find ${by}'s comment: it says what it wants` : ''}.`,
              data.run?.detail
                ? `Do this there: ${clipped(data.run.detail, 300)}`
                : data.bot
                  ? `Do what ${by} asks, on the pull request.`
                  : 'Do what the run left for you, on the pull request.',
              data.bot
                ? `${by} reads it again: this leaves Needs you once it lets the merge through, or when you click I've done it.`
                : "Come back and click I've done it: this leaves Needs you.",
            ]}
          />
        </>
      }
      rider={rider}
    />
  );
}

/** A run that stopped before it was done, or whose commits did not push: the next run, or the user's own hands. */
export function StoppedCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'stopped') return null;
  const data = move.data;
  const unpushed = data.run.outcome === 'push_failed';
  const detail = data.run.detail ? `${clipped(data.run.detail, 200).replace(/[.!?…]+$/, '')}. ` : '';
  const note = `${data.run.round ? `Run ${data.run.round}` : 'The last run'}${
    unpushed ? "'s commits could not be pushed" : ' stopped before it was done'
  }${data.run.detail ? ` (${clipped(data.run.detail, 200).replace(/[.!?…]+$/, '')})` : ''}. ${
    unpushed ? 'Make the change again on the pull request as it is now.' : 'Pick it up and finish it.'
  }`;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="stopped"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={
        <p>
          {detail}
          {unpushed
            ? 'They never reached the pull request, so it is as it was before the run.'
            : 'Nothing was pushed or posted, so the pull request is as it was before the run.'}
        </p>
      }
      body={
        data.noRun ? null : (
          <StartRun
            card="try-run"
            id={`note-stopped-${move.kinds[0]}`}
            label={`Try run ${data.round}`}
            defaultNote={note}
          />
        )
      }
      secondary={<Handled first={first} kinds={data.kinds} label="I'll handle it" />}
      error={<CardError sources={['start']} />}
      whyBody={
        <Steps
          steps={[
            ...(data.run.detail
              ? ['Read why it stopped, above: it says what to fix first when the next run would stop the same way.']
              : []),
            ...(data.noRun
              ? []
              : [
                  `Click Try run ${data.round}, write in its note what to do differently, and start it. It starts from the pull request as it is now${unpushed ? ' and makes the change again' : ''}.`,
                ]),
            `${data.noRun ? 'Make' : 'Or make'} the change on GitHub yourself, then click I'll handle it: this leaves Needs you.`,
          ]}
        />
      }
      rider={rider}
    />
  );
}

/** The repo left Contribute: close the pull request, or keep it open. */
export function RepoOutCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'repo-out') return null;
  const pr = prOf(first);
  const misses = move.data.reason === 'pr_misses';
  return (
    <MoveCard
      id={move.kinds[0]}
      name="repo-out"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p data-repo-out={move.data.reason ?? ''}>{repoOutTextOf(move.data.reason)}</p>}
      primary={<Handled first={first} kinds={['REPO_OUT']} label="Keep it open" look="primary" />}
      secondary={
        pr.url ? <GithubButton href={pr.url} primary={false}>{`Open #${pr.number} on GitHub ↗`}</GithubButton> : null
      }
      whyBody={
        misses ? (
          <p>
            GitRanks suggests none of its issues to others for now. This pull request stays open until you or a
            maintainer close it, and no run is offered for this.
          </p>
        ) : (
          <>
            <p>No run goes out from GitRanks here; you can still answer on GitHub yourself.</p>
            <Steps
              steps={[
                `To close it, open PR #${pr.number} on GitHub and click Close pull request at the bottom; this leaves Needs you at the next read.`,
                'To keep it open, click Keep it open: this leaves Needs you.',
              ]}
            />
          </>
        )
      }
      rider={rider}
    />
  );
}

/** No answer in 30 days: GitRanks closes it on the day named, unless the user keeps it open. */
export function SilentCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'silent') return null;
  const pr = prOf(first);
  const day = silentCloseDayOf(move.data.closesOn);
  return (
    <MoveCard
      id={move.kinds[0]}
      name="silent"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p data-silent-closes={move.data.closesOn ?? ''}>{silentTextOf(move.data.closesOn)}</p>}
      primary={<Handled first={first} kinds={['SILENT']} label="Keep it open" look="primary" />}
      secondary={
        pr.url ? <GithubButton href={pr.url} primary={false}>{`Open #${pr.number} on GitHub ↗`}</GithubButton> : null
      }
      whyBody={
        <>
          <p>
            No review, comment or reply from anyone else for 30 days, counted from when it opened, when anyone else last
            spoke on it, or when a run last pushed to it, whichever came last. A word from someone else before{' '}
            {day || 'then'} clears this and keeps it open. GitRanks closes it with one short comment, saying it is happy
            to reopen if it is still wanted.
          </p>
          <Steps
            steps={[
              "Want it open? Click Keep it open: GitRanks won't close it for silence.",
              `Done with it? Close it on GitHub yourself, or leave it: GitRanks closes it ${day ? `on ${day}` : 'soon'}.`,
            ]}
          />
        </>
      }
      rider={rider}
    />
  );
}
