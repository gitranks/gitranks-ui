import { MarkHandledButton } from './follow-up-buttons';
import type { ContributeNeedsYou } from '@/lib/contribute/contribute.types';
import { signalText } from '@/lib/contribute/follow-up-format';

/**
 * What happened on the pull request since the user last acted on it, newest first, each with when; with `prId`,
 * "Mark as handled" under them. Each leaves on its own once its cause is gone on GitHub.
 */
export function PrSignals({
  needsYou,
  now,
  prId,
  prNumber,
}: {
  needsYou: ContributeNeedsYou | null | undefined;
  now?: Date;
  prId?: string;
  prNumber?: number;
}) {
  if (needsYou === undefined) {
    return <p className="text-sm text-muted-foreground">What changed on GitHub is not available yet.</p>;
  }
  if (!needsYou?.signals.length) return null;
  const list = (
    <ul data-signals={needsYou.signals.length} className="flex flex-col gap-1 text-sm">
      {[...needsYou.signals].reverse().map((signal, index) => (
        <li key={`${index}-${signal.kind}-${signal.at}`} data-signal={signal.kind} className="flex gap-2">
          <span aria-hidden="true" className="text-warning">
            •
          </span>
          <span>{signalText(signal, now)}</span>
        </li>
      ))}
    </ul>
  );
  if (!prId) return list;
  return (
    <div className="flex flex-col gap-2">
      {list}
      {/* A signal arriving later is a new "needs you": the button starts afresh. */}
      <MarkHandledButton key={needsYou.since} prId={prId} prNumber={prNumber} />
    </div>
  );
}
