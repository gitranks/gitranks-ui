'use client';

import { CircleHelp, Coins, Handshake, Scale } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { CONTRIBUTE_RULES_PATH } from '@/lib/workspace/fair-use';
import {
  looksLineOf,
  numbersLineOf,
  VISITOR_LOOKS_LINE,
  WHY_HIDDEN_CLOSING,
  WHY_HIDDEN_REASONS,
} from '@/lib/workspace/masked-issue';
import type { IssueLooksToday, IssueNumbers } from '@/lib/workspace/masked-issue.types';

export const WHY_HIDDEN_TITLE = 'Why we hide issue details';

const REASON_ICONS = { cost: Coins, promise: Handshake, fair: Scale } as const;

/** The window's words: our numbers first, then why, then what seeing an issue costs, then the Terms. */
export function WhyHiddenBody({ numbers }: { numbers: Pick<IssueNumbers, 'read' | 'kept'> | null }) {
  return (
    <div className="flex flex-col gap-4 text-sm" data-why-hidden="">
      <p className="m-0">{numbersLineOf(numbers)}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {WHY_HIDDEN_REASONS.map((reason) => {
          const Icon = REASON_ICONS[reason.id];
          return (
            <li key={reason.id} className="flex gap-3">
              <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-3" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{reason.title}</span>
                <span className="text-muted-foreground">{reason.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="m-0">{WHY_HIDDEN_CLOSING}</p>
      <Link href={CONTRIBUTE_RULES_PATH} prefetch={false} className="self-start font-medium text-link hover:underline">
        How you may use issues from GitRanks: our Terms →
      </Link>
    </div>
  );
}

/** The link that opens the window. */
function WhyHiddenTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-link hover:underline"
      data-why-hidden-link=""
    >
      <CircleHelp aria-hidden="true" className="size-3.5" />
      Why do we hide issue details?
    </button>
  );
}

/**
 * "Why do we hide issue details?" and its window: a dialog, a drawer on a phone (a drawer until the page knows its
 * width, so the server and the first render agree), with the numbers of a night.
 */
export function WhyHiddenDialog({
  numbers,
  defaultOpen = false,
}: {
  numbers: Pick<IssueNumbers, 'read' | 'kept'> | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);
  const wide = useMediaQuery('(min-width: 768px)');
  useEffect(() => setMounted(true), []);

  const trigger = <WhyHiddenTrigger onOpen={() => setOpen(true)} />;
  if (!mounted || !wide) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{WHY_HIDDEN_TITLE}</DrawerTitle>
              <DrawerDescription className="sr-only">Why a list shows issues without their details</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-2">
              <WhyHiddenBody numbers={numbers} />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]" data-why-hidden-dialog="">
          <DialogTitle>{WHY_HIDDEN_TITLE}</DialogTitle>
          <DialogDescription className="sr-only">Why a list shows issues without their details</DialogDescription>
          <WhyHiddenBody numbers={numbers} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-h-10 px-4 font-semibold">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "You can see 20 full issues a day. 17 left today.", its numbers set apart; a visitor's line without a count. */
export function LooksLine({ looks, className }: { looks: IssueLooksToday | null; className?: string }) {
  if (!looks) {
    return <span className={cn('text-sm text-muted-foreground', className)}>{VISITOR_LOOKS_LINE}</span>;
  }
  return (
    <span className={cn('text-sm text-muted-foreground', className)} data-looks-line="">
      {looksLineOf(looks)
        .split(/(\d[\d,]*)/)
        .map((part, at) =>
          /^\d/.test(part) ? (
            <span key={at} className="font-mono font-semibold text-foreground tabular-nums">
              {part}
            </span>
          ) : (
            part
          ),
        )}
    </span>
  );
}

/**
 * Under every list of masked issues, and on the page of one issue: the link to the window on the left, the day's full
 * issues on the right (a visitor: that seeing one needs a sign-in, and costs no money).
 */
export function MaskedListFoot({
  looks,
  numbers,
  className,
}: {
  /** The day's full issues; null for a visitor. */
  looks: IssueLooksToday | null;
  numbers: Pick<IssueNumbers, 'read' | 'kept'> | null;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-2', className)} data-masked-foot="">
      <WhyHiddenDialog numbers={numbers} />
      <LooksLine looks={looks} />
    </div>
  );
}
