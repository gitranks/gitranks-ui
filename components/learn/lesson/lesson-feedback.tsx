'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** What the rating calls: the rating, saved at once on a press; then the comment, only when the person writes one. */
export type LessonFeedbackCalls = {
  onRate: (good: boolean) => void;
  onComment: (comment: string, good: boolean) => void;
};

const SMALL = 'h-8 gap-1.5 px-2.5 text-[13px] max-sm:min-h-11';

/**
 * "How was this lesson?": Good or Not good, saved at once, the one pressed shown pressed. Then a small box above the
 * buttons offers a comment, which the person may skip.
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
  const field = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) field.current?.focus({ preventScroll: true });
  }, [open]);

  const rate = (value: boolean) => {
    setGood(value);
    setComment('');
    setOpen(true);
    onRate(value);
  };
  const close = () => setOpen(false);
  const send = () => {
    // An empty comment sends nothing: the rating is already saved.
    const text = comment.trim();
    if (text && good !== null) onComment(text, good);
    setOpen(false);
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
        {open ? (
          <div
            role="dialog"
            aria-labelledby={titleId}
            className="absolute right-0 bottom-[42px] z-10 flex w-80 max-w-full flex-col gap-3 rounded-lg border bg-card p-3 text-left shadow-sm"
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
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
            <span className="flex items-center gap-2">
              <Button type="button" className="h-8 px-3 text-[13px] max-sm:min-h-11" onClick={send}>
                Send
              </Button>
              <Button type="button" variant="ghost" className="h-8 px-3 text-[13px] max-sm:min-h-11" onClick={close}>
                No, thanks
              </Button>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
