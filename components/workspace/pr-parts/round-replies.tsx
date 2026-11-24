'use client';

import { ChevronDown, ChevronUp, Pencil, RotateCcw, X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PullRequestReply, PullRequestRound } from '@/lib/workspace/pull-request-page.types';

/** A round's small buttons: the filled one, and the others. */
export const SMALL_MAIN = 'h-9 px-4 font-semibold max-sm:min-h-11';
export const SMALL = 'h-9 px-4 max-sm:min-h-11';

const FOLD = 'flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left hover:bg-accent';

/** What a reply's buttons do: the page sends each press to the API and draws the round it answers. */
export type ReplyPresses = {
  onReplyLeftOut?: (round: number, reply: string, leftOut: boolean) => void;
  onReplyText?: (round: number, reply: string, text: string) => void;
};

/** A row that opens in place: its name, a line, and what it holds. */
export function Fold({
  name,
  line,
  tag,
  children,
  initialOpen = false,
}: {
  name: string;
  line?: string;
  tag?: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className={FOLD}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="text-sm font-semibold text-foreground">{name}</span>
        {tag ? (
          <span className="rounded-full border px-1.5 text-[11px] font-medium text-muted-foreground">{tag}</span>
        ) : null}
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">{line ?? ''}</span>
        {open ? (
          <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      <div id={id} hidden={!open} className="flex flex-col gap-2 ps-3">
        {children}
      </div>
    </div>
  );
}

/**
 * One reply the agent drafted: edit it, leave it out, or put it back. Only a round that is ready takes edits. The
 * focus comes back to the reply's own control: to its edit button after saving or cancelling, and to the button that
 * replaced the one pressed after leaving it out or putting it back.
 */
function ReplyRow({
  reply,
  round,
  editable,
  onReplyLeftOut,
  onReplyText,
}: { reply: PullRequestReply; round: number; editable: boolean } & ReplyPresses) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply.text);
  const fieldId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const edit = useRef<HTMLButtonElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const backToEdit = useRef(false);
  const backToToggle = useRef(false);
  useEffect(() => {
    if (editing) field.current?.focus();
    else if (backToEdit.current) {
      backToEdit.current = false;
      edit.current?.focus();
    }
  }, [editing]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the reply left out or put back is what moves the focus.
  useEffect(() => {
    if (!backToToggle.current) return;
    backToToggle.current = false;
    toggle.current?.focus();
  }, [reply.leftOut]);
  const icon = 'size-8 text-muted-foreground max-sm:size-11';
  const close = () => {
    backToEdit.current = true;
    setEditing(false);
  };
  const leaveOut = (leftOut: boolean) => {
    backToToggle.current = true;
    onReplyLeftOut?.(round, reply.id, leftOut);
  };

  if (editing) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border px-3.5 py-2.5"
        data-reply={reply.id}
        data-reply-state="editing"
      >
        <label className="text-xs text-muted-foreground" htmlFor={fieldId}>
          Reply to {reply.to}
        </label>
        <Textarea
          ref={field}
          id={fieldId}
          value={text}
          rows={3}
          onChange={(event) => setText(event.target.value)}
          className="text-sm"
        />
        <span className="flex flex-wrap gap-2">
          <Button
            type="button"
            className={SMALL_MAIN}
            disabled={!text.trim()}
            onClick={() => {
              onReplyText?.(round, reply.id, text.trim());
              close();
            }}
          >
            Save the reply
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={SMALL}
            onClick={() => {
              setText(reply.text);
              close();
            }}
          >
            Cancel
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-3',
        reply.leftOut && 'border-dashed',
      )}
      data-reply={reply.id}
      data-reply-state={reply.leftOut ? 'left-out' : 'sent'}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">
          Reply to {reply.to}
          {reply.leftOut ? (
            <>
              {' · '}
              <span className="font-semibold">will not be sent</span>
            </>
          ) : null}
        </span>
        <span className={cn('text-sm', reply.leftOut ? 'text-muted-foreground line-through' : 'text-foreground')}>
          “{reply.text}”
        </span>
      </div>
      {editable ? (
        <span className="flex shrink-0 items-center gap-1">
          {reply.leftOut ? (
            onReplyLeftOut ? (
              <Button
                ref={toggle}
                type="button"
                variant="ghost"
                size="icon-sm"
                className={icon}
                aria-label={`Put back the reply to ${reply.to}`}
                title="Put this reply back"
                onClick={() => leaveOut(false)}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            ) : null
          ) : (
            <>
              {onReplyText ? (
                <Button
                  ref={edit}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={icon}
                  aria-label={`Edit the reply to ${reply.to}`}
                  title="Edit this reply"
                  onClick={() => setEditing(true)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
              ) : null}
              {onReplyLeftOut ? (
                <Button
                  ref={toggle}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={icon}
                  aria-label={`Do not send the reply to ${reply.to}`}
                  title="Do not send this reply"
                  onClick={() => leaveOut(true)}
                >
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}

/** The replies, those to one review folded into one row that opens. */
export function Replies({
  round,
  editable,
  ...presses
}: { round: PullRequestRound; editable: boolean } & ReplyPresses) {
  const groups = new Map<string, PullRequestReply[]>();
  for (const reply of round.replies) groups.set(reply.to, [...(groups.get(reply.to) ?? []), reply]);
  return (
    <>
      {[...groups].map(([to, replies]) => {
        const rows = replies.map((reply) => (
          <ReplyRow key={reply.id} reply={reply} round={round.n} editable={editable} {...presses} />
        ));
        if (replies.length < 2) return rows;
        const left = replies.filter((reply) => reply.leftOut).length;
        return (
          <Fold
            key={to}
            name={`Replies to ${to}`}
            line={`${replies.length} replies${left ? `, ${left} left out` : ''}`}
          >
            {rows}
          </Fold>
        );
      })}
    </>
  );
}
