import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { HEADING, Pill, SubTitle } from './primitives';
import {
  CHECK_LABELS,
  detailText,
  eventLabelOf,
  isOwnAgent,
  labelOf,
  timeLabel,
} from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeAttemptTest,
  ContributeModel,
} from '@/lib/contribute/contribute.types';
import { agentDidOf } from '@/lib/contribute/decisions';
import { dayLabel, MODELS, usd } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

const NOT_YET = 'Not available yet.';

/** A block of the review, with its heading, and what sits beside the heading (`aside`: its pills, say). */
function Block({
  title,
  aside,
  children,
  className,
  name,
  ...rest
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  name: string;
} & Omit<ComponentProps<'section'>, 'title' | 'children' | 'className'>) {
  const heading = <h2 className={HEADING.card}>{title}</h2>;
  return (
    <section
      data-panel={name}
      {...rest}
      className={cn('flex flex-col gap-2.5 rounded-xl border bg-card p-5', className)}
    >
      {aside ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {heading}
          {aside}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/** The chevron a closed `<details className="group">` turns when it opens. */
const Chevron = ({ className }: { className?: string }) => (
  <ChevronDown
    aria-hidden="true"
    className={cn(
      'size-4 flex-none text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none',
      className,
    )}
  />
);

const SUMMARY =
  'flex cursor-pointer list-none items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden';

/**
 * What the agent did on the session, said once: its verdict and risk, one paragraph (a no-go's reason, its summary,
 * what the check was on when it ran out, its brief, or that it is not ready yet), what is worth a look, who made it
 * when it is the user's own agent, and its notes behind a disclosure. Nothing for an ended session with nothing to say.
 */
export function AgentDidPanel({ attempt, now }: { attempt: ContributeAttemptDetail; now?: Date }) {
  const did = agentDidOf(attempt, now);
  if (!did) return null;
  const { verdict, risk, text, limitNote, worthALook, notes, ownAgent } = did;

  return (
    <Block
      title="What the agent did"
      name="agent-did"
      data-verdict={verdict?.key}
      data-go-no-go={attempt.goNoGo?.verdict}
      data-agent-text={text.kind}
      aside={
        verdict || risk ? (
          <>
            {verdict ? <Pill tone={verdict.tone}>{verdict.label}</Pill> : null}
            {risk ? <Pill tone={risk.tone}>{risk.label}</Pill> : null}
          </>
        ) : null
      }
    >
      {text.muted ? (
        <Muted>{text.words}</Muted>
      ) : (
        <p className="break-words whitespace-pre-line text-foreground/90">{text.words}</p>
      )}
      {limitNote ? (
        <span data-decided-at-limit="" className="text-xs text-muted-foreground">
          {limitNote}
        </span>
      ) : null}
      {worthALook ? (
        <div className="flex flex-col gap-1 border-t pt-2.5">
          <span className="text-xs font-semibold text-muted-foreground">Worth a look</span>
          <span className="whitespace-pre-line text-sm text-foreground/90">{worthALook}</span>
        </div>
      ) : null}
      {ownAgent?.agent ? (
        <p data-agent-meta="" className="text-xs text-muted-foreground">
          Made by {ownAgent.agent}, as your agent reported it.
        </p>
      ) : null}
      {ownAgent?.heldFor ? (
        <p data-agent-meta="" className="text-xs text-muted-foreground">
          The issue is held for it for another {ownAgent.heldFor}.
        </p>
      ) : null}
      {notes ? (
        <details data-agent-notes="" className="group border-t pt-2.5">
          <summary className={cn(SUMMARY, 'min-h-11 justify-between text-sm font-medium sm:min-h-0')}>
            The agent&apos;s notes
            <Chevron />
          </summary>
          <div className="flex flex-col gap-2 pt-2">
            {notes.brief ? (
              <p className="break-words whitespace-pre-line text-sm text-foreground/90">{notes.brief}</p>
            ) : null}
            {notes.goReason ? (
              <p className="break-words whitespace-pre-line text-sm text-foreground/90">
                <span className="font-medium">Why it went ahead:</span> {notes.goReason}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </Block>
  );
}

function TestRun({ test }: { test: ContributeAttemptTest }) {
  return (
    <div data-test-passed={test.passed} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-muted-foreground">$</span>
        <span className="min-w-0 break-all">{test.command}</span>
        <span className={test.passed ? 'text-positive' : 'text-destructive'}>
          {test.passed ? '✓ passed' : '✗ failed'}
        </span>
      </div>
      {test.output ? (
        <details>
          <summary className="cursor-pointer text-muted-foreground">Output</summary>
          <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap text-foreground/80">{test.output}</pre>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Our checks, pass or fail with the reason, and the tests the agent ran. The user's own agent reports its tests
 * itself: shown as reported, unverified.
 */
export function ChecksPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const reported = isOwnAgent(attempt);
  const tests = attempt.result?.tests ?? [];

  return (
    <Block title="Checks" name="checks">
      {attempt.checks.length ? (
        <ul className="grid grid-cols-1 gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
          {attempt.checks.map((check) => (
            <li key={check.name} data-check={check.name} data-passed={check.passed} className="flex min-w-0 gap-2">
              <span
                aria-hidden="true"
                className={cn('flex-none font-bold', check.passed ? 'text-positive' : 'text-destructive')}
              >
                {check.passed ? '✓' : '✗'}
              </span>
              <span className="min-w-0">
                <span className="sr-only">{check.passed ? 'Passed: ' : 'Failed: '}</span>
                {labelOf(CHECK_LABELS, check.name)}
                {!check.passed && check.detail ? (
                  <span className="block break-all text-muted-foreground">{check.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Muted>Our checks have not run yet.</Muted>
      )}
      <SubTitle className="pt-1">{reported ? 'Tests reported by your agent' : 'Tests the agent ran'}</SubTitle>
      {tests.length ? (
        // The terminal reads dark in both themes: the block takes the dark theme's tokens.
        <div className="dark flex flex-col gap-2.5 overflow-x-auto rounded-lg bg-background px-3.5 py-3 font-mono text-xs leading-relaxed text-foreground">
          {tests.map((test, index) => (
            <TestRun key={`${index}-${test.command}`} test={test} />
          ))}
        </div>
      ) : (
        <Muted>{attempt.result ? 'The agent ran no tests.' : NOT_YET}</Muted>
      )}
    </Block>
  );
}

/** `Sonnet 5.5`; a model this UI does not know yet by its raw name. */
const modelName = (model: ContributeModel | null) => (model ? (MODELS[model]?.replace(/^Claude /, '') ?? model) : null);

/**
 * What the attempt cost on the user's key, split by phase, against the attempt's limit. The user's own agent ran on
 * their machine: nothing was spent on their key.
 */
export function CostPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  if (isOwnAgent(attempt)) {
    return (
      <Block title="What it cost" name="cost" data-own-agent="" className="p-4.5">
        <p className="text-sm text-foreground/90">Nothing on your Claude key: your agent ran on your machine.</p>
      </Block>
    );
  }
  const { cost } = attempt;
  const model = modelName(attempt.model);

  return (
    <Block title="What it cost" name="cost" className="p-4.5">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold">{usd(cost.totalUsd)}</span>
        <span className="text-sm text-muted-foreground">of your {usd(attempt.budgetUsd)} limit</span>
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Go/no-go check</dt>
        <dd className="font-mono">{usd(cost.goNoGoUsd)}</dd>
        <dt className="text-muted-foreground">Fix{model ? ` (${model})` : ''}</dt>
        <dd className="font-mono">{usd(cost.workUsd)}</dd>
        <dt className="text-muted-foreground">Sandbox running time</dt>
        <dd className="font-mono">{usd(cost.runtimeUsd)}</dd>
      </dl>
      <span className="text-xs text-muted-foreground">At list price, on your Claude key.</span>
    </Block>
  );
}

/** Every change of the attempt, oldest first. */
export function TimelinePanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  return (
    <Block title="Timeline" name="timeline" className="p-4.5">
      {attempt.events.length ? (
        <ol className="flex flex-col gap-2 text-xs">
          {attempt.events.map((event, index) => {
            const detail = detailText(event.detail);
            return (
              <li
                key={`${index}-${event.at}`}
                data-event={event.state}
                className="grid grid-cols-[112px_minmax(0,1fr)] gap-2.5"
              >
                <time dateTime={event.at} className="font-mono text-muted-foreground">
                  {timeLabel(event.at).replace(' UTC', '')}
                </time>
                <span className="text-foreground/90">
                  {eventLabelOf(event, attempt)}
                  {detail ? <span className="text-muted-foreground"> · {detail}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <Muted>The timeline is {NOT_YET.toLowerCase()}</Muted>
      )}
      {attempt.events.length ? <span className="text-xs text-muted-foreground">Times in UTC.</span> : null}
    </Block>
  );
}

/**
 * The notes the user gave the agent: a run's note, and what they sent their own agent back with. Nothing when there
 * is neither.
 */
export function YourNotePanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const reason = attempt.kind === 'FOLLOW_UP' ? attempt.followUpOf?.reason?.trim() : null;
  const sentBack = attempt.changesRequested ?? null;
  if (!reason && !sentBack) return null;

  return (
    <Block title="Your note" name="your-note" className="p-4.5">
      {reason ? (
        <p data-run-note="" className="text-sm break-words whitespace-pre-line">
          {reason}
        </p>
      ) : null}
      {sentBack ? (
        <div data-sent-back="" className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">You sent it back on {dayLabel(sentBack.at)}:</span>
          <p className="text-sm break-words whitespace-pre-line">{sentBack.note}</p>
        </div>
      ) : null}
    </Block>
  );
}

/**
 * How the repo installs, builds and tests, as the agent found it: closed until opened (`open`: drawn open). Nothing
 * when the agent found none.
 */
export function ReadinessPanel({ attempt, open = false }: { attempt: ContributeAttemptDetail; open?: boolean }) {
  const { readiness } = attempt;
  const rows = readiness
    ? (
        [
          ['Install', readiness.install],
          ['Build', readiness.build],
          ['Test', readiness.test],
          ['Toolchain', readiness.toolchain],
        ] as const
      ).filter(([, value]) => value)
    : [];
  if (!readiness || (!rows.length && !readiness.notes)) return null;

  return (
    <details data-panel="readiness" open={open} className="group rounded-xl border bg-card">
      <summary className={cn(SUMMARY, 'min-h-11 justify-between rounded-xl p-4.5')}>
        <span className={HEADING.card}>How the repo builds</span>
        <Chevron />
      </summary>
      <div className="flex flex-col gap-2.5 px-4.5 pb-4.5">
        {rows.length ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono break-all">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {readiness.notes ? <p className="whitespace-pre-line text-sm text-foreground/90">{readiness.notes}</p> : null}
      </div>
    </details>
  );
}

/** The title and body the user approved, once they did: one line that opens in place. */
export function ApprovalPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const { approval } = attempt;
  if (!approval) return null;

  return (
    <details data-panel="approval" className="group rounded-xl border bg-card">
      <summary className={cn(SUMMARY, 'min-h-11 rounded-xl px-4.5 py-3')}>
        <span className="flex-none text-sm font-semibold">What you approved</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {approval.title} · {dayLabel(approval.at)}
        </span>
        <Chevron />
      </summary>
      <div className="flex flex-col gap-2 px-4.5 pb-4.5">
        <pre className="max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap">
          {approval.body}
        </pre>
        {approval.dco ? <span className="text-xs text-muted-foreground">Signed off (DCO).</span> : null}
      </div>
    </details>
  );
}
