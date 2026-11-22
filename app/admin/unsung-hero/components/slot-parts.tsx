import type { HeroSlot } from '../admin.types';
import {
  cancelLiveConfirm,
  cancelStateOf,
  type MailLine,
  markableOf,
  markNotifiedConfirm,
  STATUS_LABEL,
  STATUS_TONE,
} from '../admin-copy';
import { ConfirmPress } from './confirm-press';
import { type PressAction, PressButton } from './press';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';
import { cn } from '@/lib/utils';
import { getRepoPath } from '@/utils/repo-paths';

/** A slot's repository, linked to its page here, with its package. */
export function SlotName({ slot }: Readonly<{ slot: HeroSlot }>) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={getRepoPath(slot.repo.nameWithOwner)}
          className="font-medium text-foreground no-underline hover:underline"
        >
          {slot.repo.nameWithOwner}
        </Link>
      </div>
      <span className="text-xs text-muted-foreground break-all">{slot.package.name}</span>
    </div>
  );
}

export function SlotStatus({ slot }: Readonly<{ slot: HeroSlot }>) {
  return <Pill tone={STATUS_TONE[slot.status]}>{STATUS_LABEL[slot.status]}</Pill>;
}

/** Where one of the slot's emails stands; amber when it needs the owner. */
export function MailLineText({ line }: Readonly<{ line: MailLine | null }>) {
  if (!line) return null;
  return (
    <p
      className={cn(
        'text-xs',
        line.tone === 'amber' ? 'text-warning-soft-foreground font-medium' : 'text-muted-foreground',
      )}
    >
      {line.text}
    </p>
  );
}

/**
 * Cancel and Mark notified for one slot. Cancel shows only where it can apply; where the slot is locked (its maintainer
 * was told, or may have been) the button is off and the line under it says why.
 */
export function SlotActions({
  slot,
  action,
  pending,
}: Readonly<{ slot: HeroSlot; action?: PressAction; pending?: boolean }>) {
  const cancel = cancelStateOf(slot);
  const markable = markableOf(slot);
  if (cancel.kind === 'none' && !markable) return null;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {markable && (
          <ConfirmPress
            action={action}
            pending={pending}
            intent="mark-notified"
            fields={{ id: slot.id }}
            label="Mark notified"
            copy={markNotifiedConfirm(slot.repo.nameWithOwner)}
          />
        )}
        {cancel.kind === 'cancellable' && slot.status === 'LIVE' ? (
          <ConfirmPress
            action={action}
            pending={pending}
            intent="cancel"
            fields={{ id: slot.id }}
            label="Cancel"
            variant="destructive-outline"
            copy={cancelLiveConfirm(slot.repo.nameWithOwner)}
          />
        ) : (
          cancel.kind !== 'none' && (
            <PressButton
              action={action}
              pending={pending}
              disabled={cancel.kind === 'locked'}
              intent="cancel"
              fields={{ id: slot.id }}
              variant="destructive-outline"
            >
              Cancel
            </PressButton>
          )
        )}
      </div>
      {markable && (
        <p className="max-w-64 text-right text-xs text-muted-foreground">
          Check the mailbox’s Sent folder first: mark it only if the heads-up left.
        </p>
      )}
      {cancel.kind === 'locked' && <p className="max-w-64 text-right text-xs text-muted-foreground">{cancel.why}</p>}
    </div>
  );
}
