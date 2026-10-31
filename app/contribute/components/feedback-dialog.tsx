'use client';

import { CircleCheck } from 'lucide-react';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { sendContributeFeedback } from '../actions';
import { Eyebrow } from './primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ContributeFeedbackContext, ContributeFeedbackTopic } from '@/lib/contribute/contribute.types';
import { contributeSetErrorMessage } from '@/lib/contribute/errors';
import { FEEDBACK_TOPICS, feedbackContextLine, feedbackProblemOf, type SetRules } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

/** Where the dialog was opened: the topic it starts on and what is sent along. */
export type FeedbackOpen = { topic: ContributeFeedbackTopic; context: ContributeFeedbackContext; rules?: SetRules };

/** "Suggest a change": a message about the rules, the modes or anything else, sent with where it was written. */
export function FeedbackDialog({
  open,
  maxChars,
  perDay,
  onClose,
}: {
  open: FeedbackOpen | null;
  maxChars: number;
  perDay: number;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-[520px]">
        {open ? <FeedbackForm open={open} maxChars={maxChars} perDay={perDay} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's content: topic, message, what is sent along, and Send. */
export function FeedbackForm({
  open,
  maxChars,
  perDay,
  onClose,
}: {
  open: FeedbackOpen;
  maxChars: number;
  perDay: number;
  onClose: () => void;
}) {
  const id = useId();
  const [topic, setTopic] = useState(open.topic);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const context = feedbackContextLine(open.context, open.rules);
  const length = text.trim().length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = feedbackProblemOf(text, maxChars);
    if (problem) {
      setError(problem);
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await sendContributeFeedback(topic, text, open.context);
      if (result.ok) setSent(true);
      else setError(contributeSetErrorMessage(result.error, 'feedback', { feedbackPerDay: perDay }, result.message));
    });
  };

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3" role="status" data-feedback="sent">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
          <CircleCheck aria-hidden="true" className="size-5 text-positive" />
          Thanks, it's sent
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          It went straight to the person building this. We read every message.
        </DialogDescription>
        <Button type="button" variant="outline" onClick={onClose} className="self-end">
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" data-feedback="form">
      <div className="flex flex-col gap-1">
        <DialogTitle className="text-lg font-semibold">Suggest a change</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Tell us about a rule that kept out a repo you care about, or anything else about choosing what to work on. It
          goes straight to the person building this.
        </DialogDescription>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">About</legend>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_TOPICS.map((entry) => {
            const on = entry.topic === topic;
            return (
              <button
                key={entry.topic}
                type="button"
                aria-pressed={on}
                onClick={() => setTopic(entry.topic)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm',
                  on
                    ? 'border-primary bg-brand-soft text-brand-soft-foreground'
                    : 'border-dashed text-muted-foreground hover:text-foreground',
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-text`} className="text-sm font-medium">
          Your message
        </label>
        <Textarea
          id={`${id}-text`}
          value={text}
          maxLength={maxChars}
          onChange={(event) => setText(event.target.value)}
          aria-describedby={`${id}-count`}
          aria-invalid={error ? true : undefined}
          className="min-h-28 resize-y"
          placeholder={
            open.context.repo
              ? `${open.context.repo} matters to us, but it's left out because…`
              : 'A repo we left out, a rule that seems off, a mode you miss…'
          }
        />
        <span id={`${id}-count`} className="text-xs text-muted-foreground">
          {length ? `${length.toLocaleString('en-US')} / ` : 'Up to '}
          {maxChars.toLocaleString('en-US')} characters.
        </span>
      </div>
      {context ? (
        <div className="flex flex-col gap-1 rounded-lg bg-muted px-3.5 py-2.5 text-xs" data-feedback="context">
          <Eyebrow>Sent along</Eyebrow>
          <span className="text-muted-foreground">{context}</span>
        </div>
      ) : null}
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
