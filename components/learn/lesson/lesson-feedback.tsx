'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * What the rating calls: the rating, saved on a press; then the comment, only when the person writes one. Each says
 * whether it was saved: false, or a failed call, shows that it was not.
 */
export type LessonFeedbackCalls = {
  onRate: (good: boolean) => Promise<boolean>;
  onComment: (comment: string, good: boolean) => Promise<boolean>;
};

const SMALL = 'h-8 gap-1.5 px-2.5 text-[13px] max-sm:min-h-11';

/** Whether a call saved: false when it says so or fails. */
const savedBy = (call: Promise<boolean>) => call.then((saved) => saved === true).catch(() => false);

export const RATING_NOT_SAVED = 'Your rating was not saved. Try again.';
export const COMMENT_NOT_SENT = 'Your comment was not sent. Send it again.';

/**
 * "How was this lesson?": Good or Not good, the one pressed shown pressed. Once the rating is saved, a small box above
 * the buttons offers a comment, which the person may skip. A rating that is not saved goes back to what it was, and a
 * comment that is not sent stays in the box to send again. Closing the box (Escape, Send, No thanks) puts the focus
 * back on the rating pressed; a click or the focus outside the box closes it too.
 */
export function LessonFeedback({
  good: given,
  onRate,
  onComment,
  commentOpen = false,
}: LessonFeedbackCalls & {
  /** The person's rating so far: Good, Not good, or none. */
  good: boolean | null;
  /** The comment box open, for the catalogue. */
  commentOpen?: boolean;
}) {
  const [good, setGood] = useState(given);
  const [open, setOpen] = useState(commentOpen && given !== null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<'rating' | 'comment' | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<boolean, HTMLButtonElement>());
  // The last rating pressed: an older one's answer, coming later, changes nothing.
  const rating = useRef(0);
  const titleId = useId();

  useEffect(() => {
    if (open) field.current?.focus({ preventScroll: true });
  }, [open]);

  // A press outside the box closes it, and leaves the focus where the press put it.
  useEffect(() => {
    if (!open) return;
    const onPress = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPress);
    return () => document.removeEventListener('pointerdown', onPress);
  }, [open]);

  const close = () => {
    setOpen(false);
    if (good !== null) buttons.current.get(good)?.focus({ preventScroll: true });
  };

  const rate = async (value: boolean) => {
    const before = good;
    const id = ++rating.current;
    setGood(value);
    setOpen(false);
    setError(null);
    const saved = await savedBy(onRate(value));
    if (id !== rating.current) return;
    if (!saved) {
      setGood(before);
      setError('rating');
      return;
    }
    setComment('');
    setOpen(true);
  };

  const send = async () => {
    // An empty comment sends nothing: the rating is already saved.
    const text = comment.trim();
    if (!text || good === null) return close();
    setSending(true);
    setError(null);
    const sent = await savedBy(onComment(text, good));
    setSending(false);
    if (!sent) {
      setError('comment');
      field.current?.focus({ preventScroll: true });
      return;
    }
    setComment('');
    close();
  };

  return (
    <div className="border-t pt-3" data-lesson-feedback="">
      <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-sm text-muted-foreground">How was this lesson?</span>
        <fieldset className="m-0 inline-flex min-w-0 items-center gap-2 border-0 p-0" aria-label="Rate this lesson">
          {([true, false] as const).map((value) => {
            const pressed = good === value;
            const Icon = value ? ThumbsUp : ThumbsDown;
            return (
              <Button
                key={String(value)}
                ref={(button) => {
                  if (button) buttons.current.set(value, button);
                  else buttons.current.delete(value);
                }}
                type="button"
                variant="outline"
                aria-pressed={pressed}
                onClick={() => rate(value)}
                data-rate={value ? 'good' : 'not-good'}
                className={cn(
                  SMALL,
                  'shadow-none',
                  pressed
                    ? 'border-primary bg-brand-soft/40 text-foreground hover:bg-brand-soft/40'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {value ? 'Good' : 'Not good'}
              </Button>
            );
          })}
        </fieldset>
        {error === 'rating' ? (
          <p role="alert" className="m-0 w-full text-right text-xs text-destructive" data-feedback-error="rating">
            {RATING_NOT_SAVED}
          </p>
        ) : null}
        {open ? (
          <div
            ref={box}
            role="dialog"
            aria-labelledby={titleId}
            className="absolute right-0 bottom-[42px] z-10 flex w-80 max-w-full flex-col gap-3 rounded-lg border bg-card p-3 text-left shadow-sm"
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              close();
            }}
            onBlur={(event) => {
              // The focus moved to something else on the page: a closed window or tab leaves it in the box.
              const to = event.relatedTarget as Node | null;
              if (to && !event.currentTarget.contains(to)) setOpen(false);
            }}
            data-comment-box=""
          >
            <span className="flex flex-col">
              <span id={titleId} className="text-sm font-semibold text-foreground">
                Saved. Want to tell us more?
              </span>
              <span className="text-xs text-muted-foreground">You can skip this.</span>
            </span>
            <textarea
              ref={field}
              aria-label="Your comment"
              placeholder="What was good, or what should we fix?"
              value={comment}
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
              className="h-[72px] w-full resize-none rounded-md border bg-background p-2 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {error === 'comment' ? (
              <p role="alert" className="m-0 text-xs text-destructive" data-feedback-error="comment">
                {COMMENT_NOT_SENT}
              </p>
            ) : null}
            <span className="flex items-center gap-2">
              <Button
                type="button"
                className="h-8 px-3 text-[13px] max-sm:min-h-11"
                // Not `disabled`: a disabled button drops the focus of whoever pressed it to the page.
                aria-disabled={sending || undefined}
                aria-busy={sending || undefined}
                onClick={() => {
                  if (!sending) send();
                }}
                data-comment-send=""
              >
                Send
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-3 text-[13px] max-sm:min-h-11"
                onClick={close}
                data-comment-skip=""
              >
                No, thanks
              </Button>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
