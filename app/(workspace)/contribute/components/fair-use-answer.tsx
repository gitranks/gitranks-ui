'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { FairUseAppealLive } from '@/components/workspace/fair-use-appeal-live';
import { FairUseMessage } from '@/components/workspace/fair-use-message';
import { cn } from '@/lib/utils';
import type { ContributeFairUseNotice } from '@/lib/workspace/contribute.types';
import type { ContributeActionResult } from '@/lib/workspace/errors';
import {
  CONTRIBUTE_RULES_PATH,
  choiceLabelOf,
  FAIR_USE_ANSWER_MAX,
  fairUseTextLabelOf,
  isAccessClosed,
} from '@/lib/workspace/fair-use';
import { answerFairUseNotice } from '@/lib/workspace/fair-use.actions';
import { dayLabel } from '@/lib/workspace/format';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

const LINK = 'font-semibold text-link hover:underline';
const CARD = 'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm p-5 sm:p-6';

type Answer = NonNullable<ContributeFairUseNotice['answer']>;

/** Why an answer was not sent, in the page's words; the API's own for an answer it refused. */
function errorOf(result: Extract<ContributeActionResult<unknown>, { ok: false }>): string {
  if (result.error === 'INVALID' && result.message) return result.message;
  if (result.error === 'SIGNED_OUT') return 'Sign in again to send your answer.';
  return 'Your answer was not sent. Try again in a minute.';
}

/**
 * A message from GitRanks about fair use and the user's answer to it, on its own page: the message as sent, then the
 * form (its choices when it has them, and a text box), which turns into the answer in the same place once sent; "Change
 * my answer" opens the form again, filled. A second answer replaces the first. A message that closed the access is
 * answered by asking us to look again: its words, that form and email, in place of the message and the answer.
 */
export function FairUseAnswerScreen({
  notice,
  byEmail = false,
}: {
  notice: ContributeFairUseNotice;
  /** The user has an address the message went to as well. */
  byEmail?: boolean;
}) {
  const [answer, setAnswer] = useState<Answer | null>(notice.answer);
  const [editing, setEditing] = useState(!notice.answer);
  const sent = dayLabel(notice.createdAt);

  if (isAccessClosed(notice)) {
    return (
      <div className="flex flex-col gap-5" data-answer-page="appeal">
        <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">Contribute</span>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[32px] md:leading-tight">
          A message from GitRanks
        </h1>
        {sent ? (
          <span className="-mt-2 text-sm text-muted-foreground">
            Sent {sent}
            {byEmail ? ' · also by email' : ''}
          </span>
        ) : null}
        <FairUseAppealLive />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-answer-page={editing ? 'open' : 'sent'}>
      <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">Contribute</span>
      <h1 className="text-2xl font-semibold tracking-tight md:text-[32px] md:leading-tight">A message from GitRanks</h1>
      <div className={cn(CARD, 'gap-3')} data-message={notice.kind}>
        {sent ? (
          <span className="text-sm text-muted-foreground">
            Sent {sent}
            {byEmail ? ' · also by email' : ''}
          </span>
        ) : null}
        <p className="text-base leading-relaxed">
          <FairUseMessage notice={notice} answerLinks={false} />
        </p>
      </div>
      {editing ? (
        <AnswerForm
          notice={notice}
          answer={answer}
          onSent={(next) => {
            setAnswer(next);
            setEditing(false);
          }}
        />
      ) : answer ? (
        <SentAnswer notice={notice} answer={answer} onChange={() => setEditing(true)} />
      ) : null}
      <p className="text-sm text-muted-foreground">
        Read the rule in our{' '}
        <Link href={CONTRIBUTE_RULES_PATH} prefetch={false} className={LINK}>
          Terms of service
        </Link>
        .
      </p>
    </div>
  );
}

function AnswerForm({
  notice,
  answer,
  onSent,
}: {
  notice: ContributeFairUseNotice;
  answer: Answer | null;
  onSent: (answer: Answer) => void;
}) {
  const ids = useId();
  const [choice, setChoice] = useState<string | null>(answer?.choice ?? null);
  const [text, setText] = useState(answer?.text ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startSending] = useTransition();
  const { label, optional } = fairUseTextLabelOf(notice);
  const ready = notice.choices.length ? Boolean(choice || text.trim()) : Boolean(text.trim());

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || pending) return;
    setError(null);
    startSending(async () => {
      const result = await answerFairUseNotice({ noticeId: notice.id, choice, text }).catch(
        () => ({ ok: false, error: 'FAILED' }) as const,
      );
      if (!result.ok) {
        setError(errorOf(result));
        return;
      }
      onSent(result.data.answer ?? { choice, text: text.trim(), at: new Date().toISOString() });
    });
  };

  return (
    <form onSubmit={submit} className={cn(CARD, 'gap-6 sm:min-h-[520px]')} data-answer-form="">
      {notice.choices.length ? (
        <div className="flex flex-col gap-2.5">
          <span id={`${ids}-choices`} className="mb-2 text-sm font-medium">
            Your answer
          </span>
          <RadioGroup
            aria-labelledby={`${ids}-choices`}
            value={choice ?? ''}
            onValueChange={setChoice}
            className="gap-2.5"
          >
            {notice.choices.map(({ id, label: words }) => (
              <label
                key={id}
                htmlFor={`${ids}-${id}`}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm',
                  choice === id && 'border-primary bg-brand-soft',
                )}
              >
                <RadioGroupItem id={`${ids}-${id}`} value={id} />
                {choiceLabelOf(words)}
              </label>
            ))}
          </RadioGroup>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-text`} className="flex items-center gap-2 text-sm leading-none font-medium">
          {label}
          {optional ? <span className="font-normal text-muted-foreground">optional</span> : null}
        </label>
        <Textarea
          id={`${ids}-text`}
          rows={4}
          maxLength={FAIR_USE_ANSWER_MAX}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write in your own words"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!ready || pending} className="min-h-11 px-6 font-semibold sm:min-h-9">
          {pending ? 'Sending…' : 'Send answer'}
        </Button>
        <span className="text-xs text-muted-foreground">Only the GitRanks team reads it.</span>
      </div>
    </form>
  );
}

function SentAnswer({
  notice,
  answer,
  onChange,
}: {
  notice: ContributeFairUseNotice;
  answer: Answer;
  onChange: () => void;
}) {
  const picked = notice.choices.find(({ id }) => id === answer.choice);
  return (
    <div className={cn(CARD, 'gap-5 sm:min-h-[520px]')} data-answer-sent="">
      <div role="status" className="rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm">
        <strong className="font-medium">Sent. Thank you.</strong>
        <p className="mt-1 text-foreground">Your answer reached the GitRanks team. We read every answer.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Your answer</span>
        {picked ? <span className="text-sm">{choiceLabelOf(picked.label)}</span> : null}
        {answer.text ? <p className="text-sm whitespace-pre-line text-muted-foreground">{answer.text}</p> : null}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onChange} className="min-h-11 sm:min-h-9">
          Change my answer
        </Button>
        <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
          <Link href={WORKSPACE_PATHS.contribute} prefetch={false}>
            Back to Contribute
          </Link>
        </Button>
      </div>
    </div>
  );
}
