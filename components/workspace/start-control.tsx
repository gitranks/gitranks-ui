'use client';

import { ChevronDown } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { startIssue } from '@/lib/workspace/issue-actions';
import type { StartControlKind } from '@/lib/workspace/issue-row';
import { readStartPageAttempt } from '@/lib/workspace/start/start-page.actions';
import { hostedStartOutcomeOf } from '@/lib/workspace/start-action';
import type { IssueStartFacts, IssueStartRefusalCopy } from '@/lib/workspace/start-refusals';

/** One hosted start at a time on a page: the issue whose start is being sent, if any. */
const IssueStartsContext = createContext<{ sending: string | null; setSending: (id: string | null) => void } | null>(
  null,
);

/** Around a list of rows: while one row's hosted start is sent, the other rows' controls are off. */
export function IssueStartsProvider({ children }: { children: ReactNode }) {
  const [sending, setSending] = useState<string | null>(null);
  const value = useMemo(() => ({ sending, setSending }), [sending]);
  return <IssueStartsContext.Provider value={value}>{children}</IssueStartsContext.Provider>;
}

/**
 * A row's hosted Start: sends it, and opens the run's pull request page, or keeps why it did not start (the row says
 * it under its title). A failed or timed-out call reads the viewer's attempt on the issue once before it says so.
 */
export function useHostedStart(
  issueId: string,
  ref: { repo: string; issue: number },
  facts?: IssueStartFacts,
  initialRefusal: IssueStartRefusalCopy | null = null,
) {
  const router = useRouter();
  const page = useContext(IssueStartsContext);
  const [sending, startSending] = useTransition();
  const [refusal, setRefusal] = useState<IssueStartRefusalCopy | null>(initialRefusal);
  const start = () => {
    if (page?.sending) return;
    page?.setSending(issueId);
    setRefusal(null);
    startSending(async () => {
      try {
        const result = await startIssue(issueId).catch(() => null);
        const outcome = await hostedStartOutcomeOf(result, ref, () => readStartPageAttempt(ref.repo, ref.issue), facts);
        if (outcome.kind === 'open') router.push(outcome.href);
        else setRefusal(outcome.refusal);
      } finally {
        page?.setSending(null);
      }
    });
  };
  return {
    start,
    sending,
    refusal,
    /** Another row's start is being sent. */
    blocked: !!page?.sending && page.sending !== issueId,
  };
}

const BUTTON = 'h-10 px-4 font-semibold max-sm:min-h-11';
const ITEM = 'min-h-11 cursor-pointer sm:min-h-9';

/**
 * Start on an issue row: a plain button that starts the hosted agent, a link to the Start page, or (both agents
 * connected) Start with a chevron and its two ways, the hosted agent first. `primary` on the first row only: one
 * primary button per view. "Starting…" and off while the hosted start is sent; off while another row's is.
 */
export function StartControl({
  control,
  primary = false,
  sending = false,
  disabled = false,
  onHosted,
  label,
}: {
  control: StartControlKind;
  primary?: boolean;
  sending?: boolean;
  disabled?: boolean;
  onHosted: () => void;
  /** Which issue, for a screen reader: "acme/widgets #42". */
  label: string;
}) {
  const variant = primary ? 'default' : 'outline';
  const off = sending || disabled;
  const sr = <span className="sr-only"> {label}</span>;
  if (control.kind === 'link') {
    return off ? (
      <Button type="button" variant={variant} disabled className={BUTTON}>
        {control.label}
        {sr}
      </Button>
    ) : (
      <Button asChild variant={variant} className={BUTTON}>
        <Link href={control.href} prefetch={false} data-start-control="link">
          {control.label}
          {sr}
        </Link>
      </Button>
    );
  }
  if (control.kind === 'hosted') {
    return (
      <Button
        type="button"
        variant={variant}
        disabled={off}
        onClick={onHosted}
        className={BUTTON}
        data-start-control="hosted"
      >
        {sending ? 'Starting…' : control.label}
        {sr}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={off}>
        <Button type="button" variant={variant} className={cn(BUTTON, 'gap-1.5 pr-3')} data-start-control="menu">
          {sending ? 'Starting…' : control.label}
          {sr}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem className={ITEM} onSelect={onHosted}>
          With the hosted agent
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={ITEM}>
          <Link href={control.ownHref as Route} prefetch={false}>
            With my own agent
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
