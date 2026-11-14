'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { AddressSwitch } from './address-switch';
import { LiveDot, Pill } from './primitives';
import { offOf, useSessionActions } from './session-actions';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import { resolvesOf } from '@/lib/contribute/comment-actions';
import { replyPreviewOf, whereOfThread } from '@/lib/contribute/follow-up-flow';
import type { ActionId } from '@/lib/contribute/hard-stop';
import { type CommentRowItem, chipOf, isMuted, outcomePillOf, shortWhereOf } from '@/lib/contribute/review-comments';
import { cn } from '@/lib/utils';

/** Rows whose reply the user edits and ticks, in a run's review. */
const EDITABLE = new Set(['needs-you', 'draft-review']);
const POSTED = new Set(['posted', 'posted-comment', 'posted-one-comment', 'posted-resolved', 'resolve-failed']);

/**
 * One review comment, closed: line 1 (its outcome, who, where, and its reply's state at the right end), then the
 * toggle (the comment and the reply, one line each), then the side control (Address or Ignore, the post tick, or the
 * link to the posted reply). The opened content (`children`) follows. `rowError`: a save of this row that failed.
 */
export function CommentRow({
  item,
  open,
  onOpenChange,
  blocked,
  rowError,
  toggleRef,
  children,
}: {
  item: CommentRowItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocked: ReadonlySet<ActionId>;
  rowError?: string | null;
  toggleRef?: (element: HTMLButtonElement | null) => void;
  children: ReactNode;
}) {
  const session = useSessionActions();
  const { draft, thread } = item;
  const target = draft ? draft.comment : thread;
  const author = target ? target.author || 'A reviewer' : 'On the pull request';
  const path = target ? whereOfThread(target) : '';
  const short = target ? shortWhereOf(target) : '';
  const bot = draft ? draft.bot === true : thread?.bot === true;
  const outcome = draft ? outcomePillOf(draft) : null;
  const chip = chipOf(item.state, draft);
  const choice = thread
    ? (session?.threads?.choice[thread.commentId] ?? (thread.ignored ? 'ignore' : 'address'))
    : null;
  const ignored = choice === 'ignore';
  const edit = draft ? (session?.replies?.edits[draft.draftId] ?? { text: draft.text, send: false }) : null;
  const editable = EDITABLE.has(item.state) && !!session?.replies && !blocked.has('push');
  const reply = draft ? replyPreviewOf(null, edit?.text ?? draft.text) : '';
  const contentId = `comment-${item.key}-content`;
  const postedUrl = draft && POSTED.has(item.state) ? githubUrlOf(draft.url) : null;
  const ticked = !!edit && edit.send && !!edit.text.trim();
  const resolves =
    !!draft && ticked && !blocked.has('resolve_threads') && resolvesOf(draft, session?.replies?.resolveHumans);
  const name = [
    target ? `${target.author || 'A reviewer'}${path ? ` on ${path}` : ''}` : 'On the pull request',
    outcome?.label,
    chip?.label,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li
      id={`comment-${item.key}`}
      data-row-state={item.state}
      className={cn(
        'grid scroll-mt-20 grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:[grid-template-areas:"meta_meta"_"toggle_side"_"open_open"]',
        (isMuted(item.state) || ignored) && 'text-muted-foreground',
      )}
    >
      <Collapsible open={open} onOpenChange={onOpenChange} className="contents">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:[grid-area:meta]">
          {outcome ? (
            <span aria-hidden="true">
              <Pill tone={outcome.tone}>{outcome.label}</Pill>
            </span>
          ) : null}
          <span aria-hidden="true" className={cn('font-medium text-foreground/80', outcome && 'max-sm:hidden')}>
            {author}
          </span>
          {bot ? (
            <span aria-hidden="true">
              <Pill tone="neutral">bot</Pill>
            </span>
          ) : null}
          {short ? (
            <AdaptiveTooltip
              trigger={
                <button
                  type="button"
                  aria-label={`Full path: ${path}`}
                  className="font-mono text-muted-foreground underline decoration-dotted underline-offset-2"
                >
                  {short}
                </button>
              }
            >
              <span className="font-mono break-all">{path}</span>
            </AdaptiveTooltip>
          ) : null}
          {chip ? (
            <span aria-hidden="true" className="ml-auto flex items-center gap-1.5">
              {chip.live ? <LiveDot active /> : null}
              <Pill tone={chip.tone}>
                {chip.label}
                {chip.check ? <Check aria-hidden className="size-3" /> : null}
              </Pill>
            </span>
          ) : null}
        </div>
        <CollapsibleTrigger asChild>
          <Button
            ref={toggleRef}
            type="button"
            variant="ghost"
            aria-controls={contentId}
            className="h-auto min-h-11 w-full min-w-0 flex-col items-start justify-start gap-0.5 px-2 py-1.5 text-left font-normal whitespace-normal sm:min-h-9 sm:[grid-area:toggle]"
          >
            <span className="sr-only">{name}: </span>
            <span className={cn('w-full truncate text-sm', ignored && 'line-through')}>
              {draft ? (draft.comment?.excerpt ?? 'A comment on the pull request') : thread?.excerpt}
            </span>
            {reply.trim() && !open ? (
              <span className="w-full truncate text-xs text-muted-foreground max-sm:hidden">Reply · {reply}</span>
            ) : null}
          </Button>
        </CollapsibleTrigger>
        <div className="flex flex-col items-end gap-1 max-sm:items-stretch sm:[grid-area:side]">
          {thread && choice ? (
            <AddressSwitch
              author={thread.author}
              choice={choice}
              onChoose={(next) => session?.threads?.setChoice(thread.commentId, next)}
              disabled={!session?.threads || session.threads.saving.has(thread.commentId) || offOf(session)}
              error={rowError}
            />
          ) : null}
          {draft && editable && edit ? (
            <Label className="min-h-11 justify-end gap-2 sm:min-h-9">
              <Checkbox
                checked={ticked}
                disabled={!edit.text.trim() || offOf(session)}
                onCheckedChange={(checked) =>
                  session?.replies?.setEdit(draft.draftId, { ...edit, send: checked === true })
                }
                aria-label={`Post the reply to ${draft.comment ? `${draft.comment.author || 'a reviewer'}${short ? ` on ${short}` : ''}` : 'the pull request'}`}
              />
              {resolves ? (
                <span className="text-xs font-normal text-muted-foreground">
                  resolves<span className="sr-only">: then resolves the thread</span>
                </span>
              ) : null}
            </Label>
          ) : null}
          {postedUrl ? (
            <a
              href={postedUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="See the reply on GitHub (opens in a new tab)"
              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-link sm:min-h-9"
            >
              ↗
            </a>
          ) : null}
          {draft && rowError ? (
            <span role="alert" className="text-sm text-destructive">
              {rowError}
            </span>
          ) : null}
        </div>
        <CollapsibleContent id={contentId} className="min-w-0 sm:[grid-area:open]">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
