'use client';

import type { ReactElement, ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ContributeAutopilot } from '@/lib/workspace/contribute.types';
import { type ContributeErrorCode, contributeErrorMessage } from '@/lib/workspace/errors';
import { AUTOPILOT_UNLOCK_AT, dayLabel } from '@/lib/workspace/format';
import { AUTOPILOT_LOCK_AT, autopilotRecordOf } from '@/lib/workspace/hosted-level';

/** Follow-up runs autopilot may start on one pull request, and none once the user started one there. */
export const AUTOPILOT_FOLLOW_UPS_MAX = 2;

/** The dialogs' titles and leads, shared with the design catalogue so a change reaches its boards. */
export const AUTOPILOT_HOW_TITLE = 'How autopilot works';
export const AUTOPILOT_HOW_LEAD =
  'Autopilot submits a pull request for you, without your review, when the change is ready. It stays off until you turn it on.';
export const AUTOPILOT_CONFIRM_TITLE = 'Turn on autopilot?';
export const AUTOPILOT_CONFIRM_LEAD = 'Autopilot submits pull requests for you, without your review.';
export const AUTOPILOT_CONFIRM_ACTION = 'Turn on autopilot';

/** Autopilot is off for the launch (autopilot limits spec §2): said wherever it cannot be turned on yet. */
export const AUTOPILOT_LAUNCH_LINE =
  'Autopilot opens about a month after launch. Until then every pull request waits for your review, and your record keeps counting.';

/** No address for its emails: it cannot be chosen until the user shares one. */
export const AUTOPILOT_NO_EMAIL =
  'Autopilot emails you before each submission, and we have no email for you. Sign in again and share your GitHub email to turn it on.';
/** Chosen, with no address: nothing is submitted for the user, every change waits for them. */
export const AUTOPILOT_NO_EMAIL_ON =
  'Autopilot emails you before each submission, and we have no email for you, so its changes wait for your review. Sign in again and share your GitHub email.';

/** Why choosing autopilot did not go through, in plain words. */
export function autopilotErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'INVALID' && /unlocks after/i.test(message ?? '')) {
    return `Autopilot is locked: it unlocks after ${AUTOPILOT_UNLOCK_AT} pull requests merged through GitRanks.`;
  }
  if (error === 'INVALID' && /coming|not open|unavailable/i.test(message ?? '')) {
    return AUTOPILOT_LAUNCH_LINE;
  }
  if (error === 'INVALID' && /emails you/i.test(message ?? '')) {
    return AUTOPILOT_NO_EMAIL;
  }
  return contributeErrorMessage(error, message);
}

/**
 * The user's autopilot record: merged through GitRanks, still needed to unlock, closed without merging in a row, and the
 * unlock progress. How it works is the dialog's (`AutopilotHowItWorks`), so nothing is said twice.
 */
export function AutopilotRecord({ autopilot }: { autopilot: ContributeAutopilot }) {
  const { locked, toUnlock, progress, streak } = autopilotRecordOf(autopilot);
  return (
    <div className="flex flex-col gap-4">
      <dl data-autopilot-record className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Merged through GitRanks</dt>
        <dd className="font-mono">{autopilot.mergedCount}</dd>
        <dt className="text-muted-foreground">Still needed to unlock</dt>
        <dd className="font-mono">{locked ? toUnlock : 'none, unlocked'}</dd>
        <dt className="text-muted-foreground">Closed without merging in a row</dt>
        <dd className="font-mono">
          {streak} of {AUTOPILOT_LOCK_AT}
        </dd>
      </dl>

      {locked ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span>
              {progress} of {AUTOPILOT_UNLOCK_AT} merged PRs
            </span>
            <span className="text-muted-foreground">unlocks at {AUTOPILOT_UNLOCK_AT}</span>
          </div>
          <div
            aria-hidden="true"
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${AUTOPILOT_UNLOCK_AT}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: AUTOPILOT_UNLOCK_AT }, (_, index) => (
              <span key={index} className={cn('h-1.5 rounded-sm', index < progress ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
          {autopilot.lockedAt ? (
            <span data-autopilot-locked-at className="text-sm text-warning">
              Locked on {dayLabel(autopilot.lockedAt)}: two pull requests in a row were closed without merging.{' '}
              {AUTOPILOT_UNLOCK_AT} merged since then unlock it again.
            </span>
          ) : autopilot.closedUnmergedStreak >= AUTOPILOT_LOCK_AT ? (
            <span className="text-sm text-warning">
              Locked again: your last two pull requests were closed without merging.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The link that opens how autopilot works (autopilot limits spec §4.1): an element, not a component, so the dialog's
 * trigger gives the button itself its click and its ARIA.
 */
function howItWorksLink() {
  return (
    <button
      type="button"
      data-autopilot-how
      className="block rounded-sm text-left text-sm font-semibold text-link underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 max-sm:min-h-11"
    >
      {AUTOPILOT_HOW_TITLE}
    </button>
  );
}

/** "How autopilot works" as a link, opening the full description, then the user's record. */
export function AutopilotHowLink({ autopilot, login }: { autopilot: ContributeAutopilot; login?: string }) {
  return <HowItWorksDialog autopilot={autopilot} login={login} trigger={howItWorksLink()} />;
}

/** "How autopilot works", opened by `trigger`: the full description, then the user's record. */
function HowItWorksDialog({
  autopilot,
  login,
  trigger,
}: {
  autopilot: ContributeAutopilot;
  login?: string;
  trigger: ReactElement;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{AUTOPILOT_HOW_TITLE}</DialogTitle>
          <DialogDescription>{AUTOPILOT_HOW_LEAD}</DialogDescription>
        </DialogHeader>
        <AutopilotHowItWorks autopilot={autopilot} login={login} />
        <div className="border-t pt-3">
          <AutopilotRecord autopilot={autopilot} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

const HowSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </div>
);
const HowText = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/**
 * What autopilot does and never does (autopilot limits spec §4.2), so the user knows every limit before turning it on:
 * the launch line while it is not open, then when it submits, the hour, what it never does, follow-ups, how the PR says
 * it, and unlock and lock.
 */
export function AutopilotHowItWorks({ autopilot, login }: { autopilot: ContributeAutopilot; login?: string }) {
  return (
    <div data-autopilot-how-it-works className="flex flex-col gap-4">
      {autopilot.available === true ? null : (
        <p data-autopilot-coming className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand-soft-foreground">
          {AUTOPILOT_LAUNCH_LINE}
        </p>
      )}
      <HowSection title="When it submits">
        <HowText>
          Only when every check passed, the agent says it is done and rates the risk low. Anything else waits for your
          review.
        </HowText>
      </HowSection>
      <HowSection title="An hour to stop it">
        <HowText>
          Before each submission we email you{autopilot.noticeTo ? ` at ${autopilot.noticeTo}` : ''}. You have one hour
          from that email to stop it: from the email, the contribution&apos;s page or My contributions. If the email
          can&apos;t be sent, it waits for your review.
        </HowText>
      </HowSection>
      <HowSection title="What it never does">
        <ul className="ml-4 list-disc text-sm text-muted-foreground">
          <li>
            Submit on beginner issues (labels such as good first issue, first-timers-only, newcomers, easy): those wait
            for your review.
          </li>
          <li>
            Submit on a repository whose maintainers don&apos;t allow autopilot: it waits for your review, and says
            which rule.
          </li>
          <li>Pick issues: you start every run.</li>
          <li>Post a reply you didn&apos;t approve.</li>
        </ul>
      </HowSection>
      <HowSection title="Follow-ups">
        <HowText>
          When a maintainer asks for changes, it may start up to {AUTOPILOT_FOLLOW_UPS_MAX} runs on that pull request,
          on your key. It starts none once you start one yourself. Their pushes get the same hour.
        </HowText>
      </HowSection>
      <HowSection title="On GitHub">
        <HowText>
          The pull request&apos;s footer says &quot;Opened by @{login ?? 'you'}&apos;s autopilot, not reviewed by a
          human&quot;. It is still your pull request.
        </HowText>
      </HowSection>
      <HowSection title="Unlock and lock">
        <HowText>
          It unlocks after {AUTOPILOT_UNLOCK_AT} of your pull requests are merged through GitRanks. Two closed without
          merging in a row lock it again.
        </HowText>
      </HowSection>
    </div>
  );
}

/** The six lines of the confirmation (autopilot limits spec §4.3). */
export const AUTOPILOT_CONFIRM_LINES = [
  'Only changes that passed every check and that the agent rated low risk.',
  'We email you an hour before each one, so you can stop it.',
  "Never on beginner issues, or on repositories that don't allow autopilot: those still wait for your review.",
  `Up to ${AUTOPILOT_FOLLOW_UPS_MAX} follow-up runs per pull request, on your key.`,
  'The pull request says your autopilot opened it, not reviewed by a human.',
  'Two pull requests closed without merging in a row turn it off.',
];

/** "Turn on autopilot?": what changes, and a link to read more; Cancel keeps it off (autopilot limits spec §4.3). */
export function AutopilotConfirm({
  autopilot,
  login,
  open,
  onOpenChange,
  onConfirm,
}: {
  autopilot: ContributeAutopilot;
  login?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-autopilot-confirm className="max-h-[85dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{AUTOPILOT_CONFIRM_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{AUTOPILOT_CONFIRM_LEAD}</AlertDialogDescription>
        </AlertDialogHeader>
        <AutopilotConfirmLines />
        <HowItWorksDialog autopilot={autopilot} login={login} trigger={howItWorksLink()} />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="button" onClick={onConfirm}>
            {AUTOPILOT_CONFIRM_ACTION}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AutopilotConfirmLines() {
  return (
    <ul className="ml-4 list-disc text-sm text-muted-foreground">
      {AUTOPILOT_CONFIRM_LINES.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
