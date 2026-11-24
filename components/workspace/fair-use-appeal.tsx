'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CONTRIBUTE_RULES_PATH } from '@/lib/workspace/fair-use';
import { dayLabel } from '@/lib/workspace/format';
import { APPEAL_MAX, BAN_TEXT } from '@/lib/workspace/masked-issue';
import type { FairUseAppeal } from '@/lib/workspace/masked-issue.types';

const CARD = 'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm p-5 sm:p-6';
const LINK = 'font-semibold text-link hover:underline';

export type FairUseAppealFormProps = {
  /** The person's last request, if any: one open at a time. */
  appeal: FairUseAppeal | null;
  /** Sends the request; answers it as saved, or null when it was not sent. */
  onSend?: (text: string) => Promise<FairUseAppeal | null>;
  /** Text typed and not sent yet (the catalogue's state). */
  initialText?: string;
  /** The last send failed (the catalogue's state). */
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
  const [failed, setFailed] = useState(initialFailed);
  const [sending, startSending] = useTransition();
  const open = appeal && !appeal.answeredAt;
  const ready = text.trim().length > 0 && !sending;
  const formShown = !formNeedsSend || !!onSend;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    setFailed(false);
    startSending(async () => {
      const sent = onSend ? await onSend(text.trim()).catch(() => null) : null;
      if (!sent) {
        setFailed(true);
        return;
      }
      setAppeal(sent);
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
          <p className="m-0 text-sm text-muted-foreground">
            You asked us to look again on {dayLabel(appeal.at)}. We read every request and answer by email.
          </p>
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
          {failed ? (
            <p role="alert" className="m-0 text-sm text-destructive">
              Your request was not sent. Try again in a minute.
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
