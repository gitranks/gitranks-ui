import type { ContributeCheckStatusView } from '@/lib/contribute/contribute.types';
import { CHECK_STATUSES } from '@/lib/contribute/follow-up-flow';
import { cn } from '@/lib/utils';

/** Our checks in a block: what they found, in plain words, and what it means for the push. */
export function CheckStatusNote({ status }: { status: ContributeCheckStatusView | null | undefined }) {
  if (!status) return null;
  const shown = CHECK_STATUSES[status.status] ?? CHECK_STATUSES.FAILED;
  return (
    <div
      data-check-status={status.status}
      className={cn(
        'flex flex-col gap-0.5 rounded-lg border px-3.5 py-2.5',
        shown.tone === 'green' && 'border-positive/30 bg-positive/5',
        shown.tone === 'amber' && 'border-warning/30 bg-warning-soft',
        shown.tone === 'red' && 'border-negative/30 bg-negative/5',
      )}
    >
      <span className="text-sm font-semibold">{shown.title}</span>
      <span className="text-sm text-muted-foreground">{status.note}</span>
    </div>
  );
}
