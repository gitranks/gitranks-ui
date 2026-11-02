import { HEADING, Pill } from './primitives';
import type { ContributeAttemptDetail } from '@/lib/contribute/contribute.types';
import { runDecisionsOf } from '@/lib/contribute/decisions';
import { cn } from '@/lib/utils';

const TEXT = 'text-sm break-words whitespace-pre-line text-foreground/90';

/**
 * What the agent decided on this run, in its own words: its go/no-go and why, a stop at a limit, and what it found
 * (its brief, a no-go's too). Nothing for a run that recorded none.
 */
export function AgentDecisions({ attempt }: { attempt: ContributeAttemptDetail }) {
  const decisions = runDecisionsOf(attempt);
  if (!decisions) return null;
  const { goNoGo, limitNote, stop, brief } = decisions;

  return (
    <section data-panel="decisions" className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      {/* A run with nothing decided but its brief (a follow-up's, say) is titled by it. */}
      <h2 className={HEADING.card}>{goNoGo || stop ? 'What the agent decided' : 'What the agent found'}</h2>
      {goNoGo ? (
        <div data-go-no-go={goNoGo.verdict} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Go or no-go</h3>
            <Pill tone={goNoGo.verdict === 'go' ? 'green' : 'amber'}>{goNoGo.verdict === 'go' ? 'Go' : 'No-go'}</Pill>
          </div>
          <p className={TEXT}>{goNoGo.reason}</p>
          {limitNote ? <span className="text-xs text-muted-foreground">{limitNote}</span> : null}
        </div>
      ) : null}
      {stop ? (
        <div data-limit-stop="" className={cn('flex flex-col gap-1', goNoGo && 'border-t pt-3')}>
          <p className="text-sm font-semibold">{stop.text}</p>
          {stop.detail ? <p className="text-sm text-muted-foreground">{stop.detail}</p> : null}
        </div>
      ) : null}
      {brief ? (
        <div data-brief="" className={cn('flex flex-col gap-1.5', (goNoGo || stop) && 'border-t pt-3')}>
          {goNoGo || stop ? <h3 className="text-sm font-semibold">What the agent found</h3> : null}
          <p className={TEXT}>{brief}</p>
        </div>
      ) : null}
    </section>
  );
}
