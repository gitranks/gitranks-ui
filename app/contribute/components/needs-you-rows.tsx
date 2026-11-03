import Link from 'next/link';

import { LiveDot } from './agent-runs';
import { CopyAndOpenLink, MarkHandledButton } from './follow-up-buttons';
import { Pill } from './primitives';
import type { NeedsYouItem } from '@/lib/contribute/needs-you';
import { cn } from '@/lib/utils';

/** The row's button: full width under the row on a phone; outline while a run works. */
const ROW_ACTION =
  'inline-flex min-h-10 flex-none items-center justify-center rounded-lg px-3.5 text-sm font-semibold max-sm:min-h-11 max-sm:w-full';
const ROW_ACTION_TONES = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border bg-background hover:bg-muted',
};

/** "Your move: …", or for a run under way, what it does. Untrusted parts are plain text. */
function MoveLine({ item }: { item: NeedsYouItem }) {
  const more = item.more ? <span className="text-muted-foreground"> · and {item.more} more</span> : null;
  if (item.working) {
    return (
      <span className="text-sm text-muted-foreground">
        {item.move}
        {more}
      </span>
    );
  }
  return (
    <span className="text-sm break-words text-foreground/80">
      <span className="font-semibold text-foreground">Your move: </span>
      {item.move}
      {more}
    </span>
  );
}

/** The row's one button, and its small second action under it. */
function RowAction({ item }: { item: NeedsYouItem }) {
  const { action, secondary } = item;
  if (!action && !secondary) return null;
  const className = cn(ROW_ACTION, ROW_ACTION_TONES[item.working ? 'outline' : 'primary']);
  return (
    <span className="flex flex-none flex-col items-end gap-1 max-sm:w-full max-sm:items-stretch">
      {!action ? null : 'href' in action ? (
        <Link href={action.href} prefetch={false} aria-label={action.aria} className={className}>
          {action.label}
        </Link>
      ) : action.copy ? (
        <CopyAndOpenLink
          href={action.external}
          copy={action.copy}
          label={action.label}
          ariaLabel={action.aria}
          className={className}
        />
      ) : (
        <a
          href={action.external}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={action.aria}
          className={className}
        >
          {action.label}
        </a>
      )}
      {!secondary ? null : 'href' in secondary ? (
        <Link
          href={secondary.href}
          prefetch={false}
          className="inline-flex min-h-6 items-center self-end text-xs font-semibold text-link hover:underline max-sm:min-h-11 max-sm:self-start"
        >
          {secondary.label}
        </Link>
      ) : (
        <MarkHandledButton
          prId={secondary.handled.prId}
          prNumber={secondary.handled.prNumber}
          kinds={secondary.handled.kinds}
          all={secondary.handled.all}
          label={secondary.label}
          look="link"
        />
      )}
    </span>
  );
}

/**
 * One row of Needs you, as Overview and My contributions show it: the pill (a live dot while a run works), where and
 * what, the user's move, and the button that leads to it. `overview`: the pill in a column of its own; `list`: above
 * the title, as My contributions lines up its rows. Stacked on a phone, the button full width.
 */
export function NeedsYouRow({ item, look }: { item: NeedsYouItem; look: 'overview' | 'list' }) {
  const pill = (
    <>
      {item.working ? <LiveDot active /> : null}
      <Pill tone={item.tone}>{item.pill}</Pill>
    </>
  );
  const where = item.where ? (
    <span className="truncate font-mono text-xs text-muted-foreground">{item.where}</span>
  ) : null;

  if (look === 'overview') {
    return (
      <li
        data-row={item.kind}
        data-working={item.working || undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg border px-3.5 py-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-2',
          item.working ? 'border-dashed bg-background/60' : 'bg-background',
        )}
      >
        <span className="flex flex-none items-center gap-2 sm:w-44">{pill}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {where}
          {item.title ? <span className="truncate text-sm font-medium">{item.title}</span> : null}
          <MoveLine item={item} />
        </span>
        <RowAction item={item} />
      </li>
    );
  }
  return (
    <li
      data-row={item.kind}
      data-working={item.working || undefined}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0',
        item.working && 'bg-muted/30',
      )}
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {where}
          {pill}
        </span>
        {item.title ? <span className="font-medium">{item.title}</span> : null}
        <MoveLine item={item} />
      </div>
      <RowAction item={item} />
    </li>
  );
}
