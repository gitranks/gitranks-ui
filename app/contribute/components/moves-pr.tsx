import { CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './code-block';
import { MarkHandledButton } from './follow-up-buttons';
import { AddressTitle, CardError, StartRun } from './head-actions';
import { allKindsOf, GithubButton, MoveCard, Steps } from './move-card';
import type { CardProps } from './move-props';
import { IssueWhy, RuleFixState, RuleItemControls } from './pr-conventions-card';
import { Separator } from '@/components/ui/separator';
import { editableBodyOf, githubUrlOf, isOwnAgent } from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributePrSignal,
  ContributePrSignalKind,
} from '@/lib/contribute/contribute.types';
import { type RuleItem, ruleItemTitleOf } from '@/lib/contribute/contribution-moves';
import { FOLLOW_UP_THREADS_MAX } from '@/lib/contribute/follow-up-flow';
import { autopilotLineOf, FILLED_NOTE_HINT, signalText } from '@/lib/contribute/follow-up-format';
import { usd } from '@/lib/contribute/format';
import type { ActionId } from '@/lib/contribute/hard-stop';
import { clipped } from '@/lib/contribute/needs-you';
import { PR_FIX_WORDS } from '@/lib/contribute/pr-conventions';
import { noRunWhyOf } from '@/lib/contribute/session-status';
import { waitingThreadsOf } from '@/lib/contribute/sessions';

/** The open pull request's number, link and node id, as the next step's cards name it. */
export const prOf = (first: ContributeAttemptDetail) => ({
  prId: first.pullRequest?.prId ?? '',
  number: first.pullRequest?.number ?? 0,
  url: githubUrlOf(first.pullRequest?.url),
});

/** "Mark as handled": the signals the card speaks for leave Needs you. */
export function Handled({
  first,
  kinds,
  label,
  look = 'large',
}: {
  first: ContributeAttemptDetail;
  kinds: ContributePrSignalKind[];
  label: string;
  look?: 'large' | 'primary';
}) {
  const pr = prOf(first);
  if (!pr.prId || !kinds.length) return null;
  return (
    <MarkHandledButton
      prId={pr.prId}
      prNumber={pr.number}
      kinds={kinds}
      all={allKindsOf(first, kinds)}
      label={label}
      look={look}
    />
  );
}

/** What a run acts on, one line each: the reads' signals, with when. */
function RunItems({ signals, round, now }: { signals: ContributePrSignal[]; round: number; now: Date }) {
  if (!signals.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Run {round} works on</h3>
      <ul className="flex flex-col gap-2" data-run-items={signals.length}>
        {signals.map((signal) => (
          <li
            key={`${signal.kind}-${signal.at}`}
            data-run-item={signal.kind}
            className="flex items-start gap-2.5 rounded-lg border bg-background px-3.5 py-2.5 text-sm"
          >
            <CheckIcon aria-hidden="true" strokeWidth={2.4} className="mt-0.5 size-4 flex-none text-primary" />
            <span className="min-w-0 break-words">{signalText(signal, now)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The next run: what it works on, the note, Start; or on a pull request no run may add to, GitHub. */
export function NextRunCard({ move, first, view, now, rider }: CardProps) {
  if (!first || move.data.card !== 'next-run') return null;
  const data = move.data;
  const pr = prOf(first);
  const lead = move.kinds[0];
  const check = data.signals.find(({ kind }) => kind === 'CHECK_FAILED')?.detail?.trim() || 'A check';
  const fails = check.includes(', ') ? 'fail' : 'fails';
  const cap = view.contributor?.settings?.attemptCapUsd;
  const limit = typeof cap === 'number' ? `within your ${usd(cap)} limit per run` : 'within your limit per run';

  if (data.noRun) {
    const why =
      data.noRun === 'stopped'
        ? lead === 'changes'
          ? 'A reviewer asked for changes. Answer them on GitHub.'
          : lead === 'comment'
            ? 'Someone commented on it. Answer it on GitHub.'
            : lead === 'check'
              ? `${check} ${fails} on your pull request. Fix it on your branch.`
              : 'Something changed on it. See it on GitHub.'
        : noRunWhyOf(data.noRun);
    const label = lead === 'comment' ? "I've replied" : lead === 'check' ? "I've fixed it" : "I've done it";
    return (
      <MoveCard
        id={lead}
        name="next-run"
        tone={move.tone}
        kindLine={move.kindLine}
        title={move.title}
        why={<p>{why}</p>}
        primary={pr.url ? <GithubButton href={pr.url} primary>{`Open #${pr.number} on GitHub ↗`}</GithubButton> : null}
        secondary={<Handled first={first} kinds={data.kinds} label={label} />}
        rider={rider}
      />
    );
  }

  const threads = waitingThreadsOf(first);
  const why =
    lead === 'threads' || (lead === 'changes' && threads.length)
      ? `Pick the comments below. The agent fixes what it can and drafts a reply to each, ${limit}. Nothing goes to GitHub before you check it.`
      : lead === 'changes'
        ? `The agent reads every review, comment and check, fixes what it can and drafts replies, ${limit}.`
        : lead === 'comment'
          ? 'Someone commented on it. The agent reads it with everything else on the pull request and drafts an answer.'
          : lead === 'check'
            ? `${check} ${fails} on your pull request. The agent reads the check's output and fixes what it can.`
            : lead === 'other'
              ? "Something changed on the pull request that this page can't name."
              : `GitRanks sees something a run can act on. The agent reads every review, comment and check, fixes what it can and drafts replies, ${limit}.`;
  const autopilotOn = !!view.contributor?.settings?.autopilot && !!view.contributor.autopilot?.unlocked;
  const byAuthor = Object.fromEntries(
    (first.reviewFeedback?.threads ?? []).map((thread) => [thread.commentId, thread.author || 'a reviewer']),
  );
  const title =
    lead === 'threads' || (lead === 'changes' && threads.length) ? (
      <AddressTitle fallback={move.title} byAuthor={byAuthor} />
    ) : (
      move.title
    );
  return (
    <MoveCard
      id={lead}
      name="next-run"
      tone={move.tone}
      kindLine={move.kindLine}
      title={title}
      why={<p>{why}</p>}
      body={
        <>
          <RunItems signals={data.signals} round={data.round} now={now} />
          <StartRun
            card="next-run"
            id={`note-next-run-${lead}`}
            label={`Start run ${data.round}`}
            defaultNote={data.note}
            hint={data.note ? FILLED_NOTE_HINT : undefined}
          />
        </>
      }
      secondary={
        <>
          {pr.url ? (
            <GithubButton href={pr.url} primary={false}>
              {threads.length ? 'Answer them yourself ↗' : `Open #${pr.number} on GitHub ↗`}
            </GithubButton>
          ) : null}
          <Handled first={first} kinds={data.kinds} label="Mark as handled" />
        </>
      }
      error={<CardError sources={['start', 'discard']} />}
      whyBody={
        <>
          {autopilotOn && first.followUps && !isOwnAgent(first) ? <p>{autopilotLineOf(first.followUps)}</p> : null}
          <p>Your note comes first: where it and a comment on the pull request disagree, the agent follows yours.</p>
          <p>
            A run takes {FOLLOW_UP_THREADS_MAX} comments at most. Set the rest to Ignore: they stay out of every run,
            autopilot&apos;s too, until you address them again or someone comments on them.
          </p>
        </>
      }
      rider={rider}
    />
  );
}

/** An agreement to sign: by a comment posted word for word, or on its page. Only the user can sign it. */
export function AgreementCard({ move, first, rider }: CardProps) {
  if (!first || move.data.card !== 'agreement') return null;
  const data = move.data;
  const pr = prOf(first);
  const byComment = !!data.signComment;
  const check = data.check ? ` (its check: ${data.check})` : '';
  const sign = data.signUrl ?? pr.url;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="agreement"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={
        <p>
          {byComment
            ? 'The repo records a signature from a comment by you. Neither the agent nor GitRanks can sign for you.'
            : `The repo merges code only from people who signed its ${data.agreement}${check}. It is a legal agreement in your name, so only you can sign it.`}
        </p>
      }
      body={
        byComment ? (
          <div className="flex flex-col gap-1.5">
            <CodeBlock label="Your comment on the pull request" copyLabel="Copy the comment" wrap>
              {data.signComment ?? ''}
            </CodeBlock>
            {data.signUrl ? (
              <a href={data.signUrl} target="_blank" rel="noreferrer" className="self-start text-sm text-link">
                Read the {data.agreement} first<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        ) : null
      }
      primary={
        byComment ? (
          pr.url ? (
            <GithubButton href={pr.url} primary>{`Open #${pr.number} on GitHub ↗`}</GithubButton>
          ) : null
        ) : sign ? (
          <GithubButton href={sign} primary>{`Sign the ${data.agreement} ↗`}</GithubButton>
        ) : null
      }
      secondary={<Handled first={first} kinds={['CLA']} label={byComment ? 'I posted it' : 'I signed it'} />}
      whyOpen
      whyLabel="What to do"
      whyBody={
        <Steps
          title={`How to sign${data.check ? ` (${data.check})` : ''}`}
          steps={
            byComment
              ? [
                  'Copy the comment above.',
                  `Open PR #${pr.number} on GitHub, paste it into the comment box at the bottom, word for word, and click Comment.`,
                  "The repo's bot records your signature and its check runs again; then click I posted it.",
                ]
              : [
                  data.signUrl
                    ? `Click Sign the ${data.agreement} above.`
                    : `Click Sign the ${data.agreement} above, then open the details of the ${data.check ?? 'agreement'} check on the pull request: it links to the page to sign.`,
                  'Follow its page to sign (most ask you to sign in with GitHub, then accept).',
                  'Its check runs again: this clears once it passes, or click I signed it.',
                ]
          }
        />
      }
      rider={rider}
    />
  );
}

/** A rule item whose own main control is GitHub (no one-click fix, or one a stop holds back): the card adds none. */
const linksGithub = (item: RuleItem, blocked: ReadonlySet<ActionId>) => {
  switch (item.kind) {
    case 'title':
      return !item.issue || blocked.has('retitle');
    case 'description':
      return !item.issue?.check || blocked.has('edit_description');
    case 'changelog':
      return !item.issue?.suggestion || blocked.has('fix_changelog') || blocked.has('fix_link');
    case 'cla':
      return false;
  }
};

/** The repo's rules the pull request breaks: one item, or several, each with its fix; GitHub beside them. */
export function RulesCard({ move, first, blocked, rider }: CardProps) {
  if (!first || move.data.card !== 'rules') return null;
  const { items, fix } = move.data;
  const pr = prOf(first);
  const one = items.length === 1 ? items[0] : null;
  const fixed = fix?.state === 'FAILED' ? fix : null;
  const agreement = first.conventions?.cla?.agreement ?? 'CLA';
  const whyOf = (item: (typeof items)[number]) => {
    if (item.failed && fixed)
      return `${PR_FIX_WORDS[fixed.kind]} didn't go through${fixed.note ? `: ${clipped(fixed.note, 200)}` : ''}.`;
    switch (item.kind) {
      case 'title':
        return item.issue
          ? `${item.issue.source?.label ? `The repo's rules (${item.issue.source.label}) set a rule for titles` : 'The repo sets a rule for pull request titles'}, and this one breaks it.`
          : 'The repo sets a rule for pull request titles, and this one breaks it. GitRanks found no title it could set in one click.';
      case 'description':
        return item.issue?.check
          ? `The repo's "${item.issue.check}" check fails on the description.`
          : "The repo's rules say the person who tested the change fills in the description, so the agent left it empty.";
      case 'changelog':
        return 'The repo wants a changelog line for each pull request, and this one is missing or off.';
      case 'cla':
        // The comment shows below, to copy: the line says what to do with it.
        return first.conventions?.cla?.signComment
          ? `Sign the repo's ${agreement}: post this comment on the pull request yourself. We can't sign for you.`
          : (item.issue?.message ?? `Sign the repo's ${agreement}.`);
    }
  };
  const controls = (item: (typeof items)[number], index: number) => (
    <RuleItemControls
      attemptId={first.attemptId}
      kind={item.kind}
      issue={item.issue}
      failed={item.failed}
      primary={index === 0}
      title={first.prTitle ?? first.approval?.title ?? ''}
      body={editableBodyOf(first.prBody ?? first.approval?.body ?? first.result?.prBody)}
      conventions={first.conventions ?? null}
      pr={pr}
      titleAll={allKindsOf(first, ['TITLE'])}
      blocked={{
        retitle: blocked.has('retitle'),
        body: blocked.has('edit_description'),
        changelog: blocked.has('fix_changelog') || blocked.has('fix_link'),
      }}
    />
  );
  const body: ReactNode = one ? (
    controls(one, 0)
  ) : (
    <ul className="flex flex-col gap-3" data-rule-items={items.length}>
      {items.map((item, index) => (
        <li key={item.kind} className="flex flex-col gap-2">
          {index ? <Separator /> : null}
          <h3 className="text-sm font-semibold">{ruleItemTitleOf(item, agreement)}</h3>
          <p className="text-sm text-muted-foreground">{whyOf(item)}</p>
          {controls(item, index)}
        </li>
      ))}
    </ul>
  );
  const issues = items.flatMap((item) => (item.issue ? [item.issue] : []));
  return (
    <MoveCard
      id={move.kinds[0]}
      name="rules"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p>{one ? whyOf(one) : 'Each rule says what the repo asks; fix them here or on GitHub.'}</p>}
      body={
        <>
          {body}
          <RuleFixState fix={fix} />
        </>
      }
      secondary={
        pr.url && !items.some((item) => linksGithub(item, blocked)) ? (
          <GithubButton href={pr.url} primary={false}>{`Open #${pr.number} on GitHub ↗`}</GithubButton>
        ) : null
      }
      whyOpen={!!one && one.kind === 'description' && !one.issue?.check}
      whyBody={
        issues.length ? (
          <div className="flex flex-col gap-3 text-sm">
            {issues.map((issue, index) => (
              <div key={`${issue.kind}-${index}`} className="flex flex-col gap-1.5">
                <IssueWhy issue={issue} />
              </div>
            ))}
          </div>
        ) : one && !one.issue ? (
          <Steps
            steps={[
              `Open PR #${pr.number} on GitHub and click Edit beside its title.`,
              "Write a title that follows the repo's rule (its CONTRIBUTING file, or the titles of its merged pull requests, show the shape) and click Save.",
              "This clears once the pull request holds another title, or click I've done it.",
            ]}
          />
        ) : null
      }
      rider={rider}
    />
  );
}
