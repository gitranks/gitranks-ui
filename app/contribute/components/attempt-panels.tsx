import type { ReactNode } from 'react';

import { Pill } from './primitives';
import {
  CHECK_LABELS,
  detailText,
  EVENT_LABELS,
  labelOf,
  RISKS,
  timeLabel,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeAttemptTest,
  ContributeModel,
} from '@/lib/contribute/contribute.types';
import { MODELS, usd } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

const NOT_YET = 'Not available yet.';

/** A block of the review, with its heading. */
function Block({
  title,
  children,
  className,
  name,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  name: string;
}) {
  return (
    <section data-panel={name} className={cn('flex flex-col gap-2.5 rounded-xl border bg-card p-5', className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

const VERDICTS = { DONE: 'Done', PARTIAL: 'Partly done', NO_GO: 'No-go' } as const;

/** What the agent changed, in its own words, and what it thinks is worth a second look. */
export function ResultPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const { result } = attempt;
  if (!result) {
    return (
      <Block title="What the agent changed" name="result">
        <Muted>The agent&apos;s summary is {NOT_YET.toLowerCase()}</Muted>
      </Block>
    );
  }
  const risk = result.risk ? toneLabelOf(RISKS, result.risk) : null;

  return (
    <Block title="What the agent changed" name="result">
      <div className="flex flex-wrap gap-1.5">
        {result.verdict ? (
          <Pill tone={result.verdict === 'DONE' ? 'green' : 'amber'}>{labelOf(VERDICTS, result.verdict)}</Pill>
        ) : null}
        {risk ? <Pill tone={risk.tone}>{risk.label}</Pill> : <Pill>Risk not rated</Pill>}
      </div>
      <p className="whitespace-pre-line text-foreground/90">{result.summary || 'No summary was given.'}</p>
      {result.riskNotes ? (
        <div className="flex flex-col gap-1 border-t pt-2.5">
          <span className="text-[13px] font-semibold text-muted-foreground">Worth a look</span>
          <span className="whitespace-pre-line text-sm text-foreground/90">{result.riskNotes}</span>
        </div>
      ) : null}
      {result.filesChanged.length ? (
        <p className="text-sm text-muted-foreground">
          {result.filesChanged.length} file{result.filesChanged.length === 1 ? '' : 's'} changed
        </p>
      ) : null}
    </Block>
  );
}

function TestRun({ test }: { test: ContributeAttemptTest }) {
  return (
    <div data-test-passed={test.passed} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-zinc-400">$</span>
        <span className="min-w-0 break-all">{test.command}</span>
        <span className={test.passed ? 'text-green-300' : 'text-red-300'}>{test.passed ? '✓ passed' : '✗ failed'}</span>
      </div>
      {test.output ? (
        <details>
          <summary className="cursor-pointer text-zinc-400">Output</summary>
          <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap text-zinc-300">{test.output}</pre>
        </details>
      ) : null}
    </div>
  );
}

/** Our checks, pass or fail with the reason, and the tests the agent ran. */
export function ChecksPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const tests = attempt.result?.tests ?? [];

  return (
    <Block title="Checks" name="checks">
      {attempt.checks.length ? (
        <ul className="grid grid-cols-1 gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
          {attempt.checks.map((check) => (
            <li key={check.name} data-check={check.name} data-passed={check.passed} className="flex min-w-0 gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'flex-none font-bold',
                  check.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
                )}
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
      <h3 className="pt-1 text-sm font-semibold">Tests the agent ran</h3>
      {tests.length ? (
        <div className="flex flex-col gap-2.5 overflow-x-auto rounded-lg bg-zinc-900 px-3.5 py-3 font-mono text-[13px] leading-relaxed text-zinc-200">
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

/** What the attempt cost on the user's key, split by phase, against the attempt's limit. */
export function CostPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const { cost } = attempt;
  const model = modelName(attempt.model);

  return (
    <Block title="What it cost" name="cost" className="p-4.5">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[26px] font-bold">{usd(cost.totalUsd)}</span>
        <span className="text-sm text-muted-foreground">of your {usd(attempt.budgetUsd)} limit</span>
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
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
        <ol className="flex flex-col gap-2 text-[13px]">
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
                  {labelOf(EVENT_LABELS, event.state)}
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

/** How the repo installs, builds and tests, as the agent found it. */
export function ReadinessPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
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
    <Block title="How the repo builds" name="readiness" className="p-4.5">
      {rows.length ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono break-all">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {readiness.notes ? <p className="whitespace-pre-line text-[13px] text-foreground/90">{readiness.notes}</p> : null}
    </Block>
  );
}

/** The title and body the user approved, once they did. */
export function ApprovalPanel({ attempt }: { attempt: ContributeAttemptDetail }) {
  const { approval } = attempt;
  if (!approval) return null;

  return (
    <Block title="What you approved" name="approval" className="p-4.5">
      <span className="font-semibold">{approval.title}</span>
      <pre className="max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-[12.5px] whitespace-pre-wrap">
        {approval.body}
      </pre>
      <span className="text-xs text-muted-foreground">
        Approved {timeLabel(approval.at)}
        {approval.dco ? ', signed off (DCO)' : ''}.
      </span>
    </Block>
  );
}
