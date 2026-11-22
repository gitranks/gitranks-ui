'use client';

import { CalendarCheck, Hourglass } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';

import { cancelApplication } from '../actions';
import { ApplyCard, RegistryPill } from './apply-parts';
import { Pill } from '@/components/pill/pill';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ApplyRegistry, HeroApplication } from '@/lib/unsung-hero/apply.types';
import {
  applicationNameOf,
  cancelCopyOf,
  refusalTextOf,
  SCHEDULED_NOTE,
  sentDate,
  statusCopyOf,
  statusPillOf,
} from '@/lib/unsung-hero/apply-copy';
import { UNSUNG_HEROES_PATH } from '@/lib/unsung-hero/unsung-hero';
import { cn } from '@/lib/utils';

/** Cancel, after a confirm that says it removes the application whole. */
function CancelButton({ name, onCancelled }: Readonly<{ name: string; onCancelled: () => void }>) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const copy = cancelCopyOf(name);

  const confirm = async () => {
    setPending(true);
    setRefusal(null);
    const answer = await cancelApplication().catch(() => null);
    setPending(false);
    if (!answer?.ok) {
      setRefusal(refusalTextOf(answer?.refusal ?? null));
      return;
    }
    setOpen(false);
    onCancelled();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRefusal(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline">
          Cancel application
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {refusal && (
          <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
            {refusal}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={pending}>
            {copy.keep}
          </AlertDialogCancel>
          <Button type="button" onClick={confirm} disabled={pending}>
            {copy.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * "Your application": its status, the package, when it was sent and the note. In review it can be cancelled; not
 * picked (or featured) a new one can be sent; scheduled or live, it is the slot's now.
 */
export function ApplicationCard({
  application,
  registries,
  emailed = false,
  onCancelled,
  onApplyAgain,
}: Readonly<{
  application: HeroApplication;
  registries: readonly ApplyRegistry[];
  /** We email the viewer when we schedule it: their session's email is one GitHub verified. */
  emailed?: boolean;
  onCancelled?: () => void;
  onApplyAgain?: () => void;
}>) {
  const pill = statusPillOf(application);
  const { title, text } = statusCopyOf(application, emailed);
  const name = applicationNameOf(application);
  const dated = application.status === 'SCHEDULED' || application.status === 'LIVE';
  const Icon = dated || application.status === 'FEATURED' ? CalendarCheck : Hourglass;
  const pastHeroes = (
    <Button variant="outline" asChild>
      <Link href={UNSUNG_HEROES_PATH as Route} prefetch={false}>
        See past heroes
      </Link>
    </Button>
  );

  return (
    <ApplyCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Your application</span>
        <Pill tone={pill.tone}>{pill.text}</Pill>
      </div>
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className={cn('size-5 shrink-0', dated ? 'text-brand-soft-foreground' : 'text-muted-foreground')}
        />
        <h2 className="min-w-0 text-lg font-semibold break-words">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <dt className="text-muted-foreground">Package</dt>
        <dd className="m-0 flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{application.package ? name : `“${name}”`}</span>
          {application.package && <RegistryPill registries={registries} id={application.package.registry} />}
        </dd>
        <dt className="text-muted-foreground">Sent</dt>
        <dd className="m-0">{sentDate(application.sentAt)}</dd>
        {application.note && (
          <>
            <dt className="text-muted-foreground">Your note</dt>
            <dd className="m-0 break-words text-muted-foreground">{application.note}</dd>
          </>
        )}
      </dl>
      <div className="flex flex-wrap gap-3">
        {application.status === 'IN_REVIEW' && <CancelButton name={name} onCancelled={() => onCancelled?.()} />}
        {(application.status === 'NOT_PICKED' || application.status === 'FEATURED') && (
          <Button type="button" onClick={() => onApplyAgain?.()}>
            Send a new application
          </Button>
        )}
        {application.status !== 'IN_REVIEW' && application.status !== 'NOT_PICKED' && pastHeroes}
      </div>
      {dated && <p className="text-xs text-muted-foreground">{SCHEDULED_NOTE}</p>}
    </ApplyCard>
  );
}
