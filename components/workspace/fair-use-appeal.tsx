'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import type { ContributeActionResult, ContributeErrorCode } from '@/lib/workspace/errors';
import { CONTRIBUTE_RULES_PATH } from '@/lib/workspace/fair-use';
import { dayLabel } from '@/lib/workspace/format';
import { APPEAL_MAX, BAN_TEXT } from '@/lib/workspace/masked-issue';
import type { FairUseAppeal } from '@/lib/workspace/masked-issue.types';

const CARD = 'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm p-5 sm:p-6';
const LINK = 'font-semibold text-link hover:underline';

/** A send's answer: the request as saved (the one already open, when there is one), or why it was not sent. */
export type FairUseAppealSent = ContributeActionResult<FairUseAppeal>;

/**
 * Refusals that sending again will not change: the API refuses this one (an access that is not closed, a text it does
 * not take). Email is the way left.
 */
const SEND_BY_EMAIL: readonly ContributeErrorCode[] = ['INVALID', 'NOT_FOUND'];

/**
 * A request saved before the send began is the one already open. The slack keeps a browser clock a little ahead of the
 * API's from calling a new request an old one.
 */
const CLOCK_SLACK_MS = 2 * 60_000;

const mailLink = (
  <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
    {CONTACT_EMAIL}
  </a>
);

export type FairUseAppealFormProps = {
  /** The person's last request, if any: one open at a time. */
  appeal: FairUseAppeal | null;
  /** Sends the request; answers it as saved, or why it was not sent. */
  onSend?: (text: string) => Promise<FairUseAppealSent>;
  /** Text typed and not sent yet (the catalogue's state). */
  initialText?: string;
  /** The last send failed and may go through later (the catalogue's state). */
  initialFailed?: boolean;
  /** No form without `onSend`: the closing words and the Terms link alone, until the page can send a request. */
  formNeedsSend?: boolean;
};

/**
 * A closed access and the request to look again: the words of the closing, then a form with one text box, "Ask us to
 * look again". Once sent, the form gives way to the request's date in the same place, and stays away while the request
 * is open; after an answer the person can ask again.
 */
export function FairUseAppealForm({
  appeal: initial,
  onSend,
  initialText = '',
  initialFailed = false,
  formNeedsSend = false,
}: FairUseAppealFormProps) {
  const ids = useId();
  const [appeal, setAppeal] = useState(initial);
  const [text, setText] = useState(initialText);
  const [failed, setFailed] = useState<'retry' | 'email' | null>(initialFailed ? 'retry' : null);
  const [already, setAlready] = useState(false);
  const [sending, startSending] = useTransition();
  const open = appeal && !appeal.answeredAt;
  const ready = text.trim().length > 0 && !sending;
  const formShown = !formNeedsSend || !!onSend;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    setFailed(null);
    const began = Date.now();
    startSending(async () => {
      const failure: FairUseAppealSent = { ok: false, error: 'FAILED' };
      const sent = onSend ? await onSend(text.trim()).catch(() => failure) : failure;
      if (!sent.ok) {
        setFailed(SEND_BY_EMAIL.includes(sent.error) ? 'email' : 'retry');
        return;
      }
      setAlready(Date.parse(sent.data.at) < began - CLOCK_SLACK_MS);
      setAppeal(sent.data);
      setText('');
    });
  };

  return (
    <div className="flex flex-col gap-5" data-fair-use-appeal={open ? 'open' : formShown ? 'form' : 'closed'}>
      <div className={cn(CARD, 'gap-3')} data-ban="">
        <p tabIndex={-1} className="m-0 text-base leading-relaxed outline-none">
          {BAN_TEXT}
        </p>
      </div>
      {open ? (
        <div className={cn(CARD, 'gap-2')} role="status" data-appeal-sent="">
          <strong className="font-semibold">We have your request</strong>
          {already ? (
            <p className="m-0 text-sm text-muted-foreground" data-appeal-already="">
              We already have your request of {dayLabel(appeal.at)}. To add to it, write to {mailLink}.
            </p>
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              You asked us to look again on {dayLabel(appeal.at)}. We read every request and answer by email.
            </p>
          )}
        </div>
      ) : formShown ? (
        <form onSubmit={submit} className={cn(CARD, 'gap-5')} data-appeal-form="">
          <h2 className="m-0 text-lg font-semibold">Ask us to look again</h2>
          {appeal?.answeredAt ? (
            <p className="m-0 text-sm text-muted-foreground">
              We answered your request of {dayLabel(appeal.at)}. You can ask again.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-text`} className="text-sm font-medium">
              Why do you think this is wrong?
            </label>
            <Textarea
              id={`${ids}-text`}
              rows={5}
              maxLength={APPEAL_MAX}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write in your own words"
            />
          </div>
          {failed === 'retry' ? (
            <p role="alert" className="m-0 text-sm text-destructive">
              Your request was not sent. Try again in a minute.
            </p>
          ) : failed === 'email' ? (
            <p role="alert" className="m-0 text-sm text-destructive">
              Your request could not be sent from here. Write to us at {mailLink}.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!ready} className="min-h-11 px-6 font-semibold sm:min-h-9">
              {sending ? 'Sending…' : 'Ask us to look again'}
            </Button>
            <span className="text-xs text-muted-foreground">Only the GitRanks team reads it.</span>
          </div>
        </form>
      ) : null}
      <p className="m-0 text-sm text-muted-foreground">
        Read the rules in our{' '}
        <Link href={CONTRIBUTE_RULES_PATH} prefetch={false} className={LINK}>
          Terms of service
        </Link>
        .
      </p>
    </div>
  );
}
