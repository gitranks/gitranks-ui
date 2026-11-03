'use client';

import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactElement, type ReactNode, useId, useState, useTransition } from 'react';

import { saveContributeSettings } from '../actions';
import { Pill } from './primitives';
import { SettingsRow } from './settings-rows';
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
import type { ContributeAutopilot } from '@/lib/contribute/contribute.types';
import { type ContributeErrorCode, contributeErrorMessage } from '@/lib/contribute/errors';
import { AUTOPILOT_UNLOCK_AT, dayLabel } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

export { AUTOPILOT_UNLOCK_AT };

/** Closed-unmerged pull requests in a row that lock it again. */
export const AUTOPILOT_LOCK_AT = 2;
/** Follow-up runs autopilot may start on one pull request, and none once the user started one there. */
export const AUTOPILOT_FOLLOW_UPS_MAX = 2;

/** Autopilot is off for the launch (autopilot limits spec §2): said wherever it cannot be turned on yet. */
export const AUTOPILOT_LAUNCH_LINE =
  'Autopilot opens about a month after launch. Until then every pull request waits for your review, and your record keeps counting.';

const NO_EMAIL =
  'Autopilot emails you before each submission, and we have no email for you. Sign in again and share your GitHub email to turn it on.';
/** The setting is on, but there is no address: nothing is submitted for the user, every change waits for them. */
const NO_EMAIL_ON =
  'Autopilot emails you before each submission, and we have no email for you, so its changes wait for your review. Sign in again and share your GitHub email.';

/** Why turning autopilot on or off did not go through, in plain words. */
export function autopilotErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'INVALID' && /unlocks after/i.test(message ?? '')) {
    return `Autopilot is locked: it unlocks after ${AUTOPILOT_UNLOCK_AT} pull requests merged through GitRanks.`;
  }
  if (error === 'INVALID' && /coming|not open|unavailable/i.test(message ?? '')) {
    return AUTOPILOT_LAUNCH_LINE;
  }
  if (error === 'INVALID' && /emails you/i.test(message ?? '')) {
    return NO_EMAIL;
  }
  return contributeErrorMessage(error, message);
}

/** Where the record stands: locked, open, merges still needed and made toward unlocking, the closed streak. */
function recordOf(autopilot: ContributeAutopilot) {
  const locked = !autopilot.unlocked;
  const toUnlock = locked ? Math.max(0, autopilot.mergedToUnlock ?? AUTOPILOT_UNLOCK_AT - autopilot.mergedCount) : 0;
  return {
    locked,
    open: autopilot.available === true,
    // `undefined`: the API does not say yet; only a known "none" blocks turning it on.
    noEmail: autopilot.noticeTo === null,
    toUnlock,
    progress: Math.min(AUTOPILOT_UNLOCK_AT, Math.max(0, AUTOPILOT_UNLOCK_AT - toUnlock)),
    streak: Math.min(autopilot.closedUnmergedStreak, AUTOPILOT_LOCK_AT),
  };
}

/**
 * Autopilot's row in Settings: the user's record (merged through GitRanks, still needed to unlock, closed without merging in a row) and
 * a toggle they own once it is unlocked, with the full record behind Details. While autopilot is not open (`available` false, or not known yet), it says it
 * is coming and the toggle cannot be turned on; a setting left on can always be turned off.
 */
export function AutopilotSection({
  autopilot,
  enabled,
  canSave,
}: {
  autopilot: ContributeAutopilot;
  enabled: boolean;
  /** Settings exist only once a key is connected. */
  canSave: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { locked, open, noEmail, progress } = recordOf(autopilot);
  const canTurnOn = open && !locked && !noEmail;
  const checked = canTurnOn ? on : on && enabled;

  const [confirming, setConfirming] = useState(false);
  // Turning it on asks first, with what changes (autopilot limits spec §4.3); turning it off saves at once.
  const change = (next: boolean) => (next ? setConfirming(true) : toggle(false));
  const toggle = (next: boolean) => {
    setConfirming(false);
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await saveContributeSettings({ autopilot: next });
      if (!result.ok) {
        setOn(!next);
        setError(autopilotErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });
  };

  return (
    <SettingsRow
      id="autopilot"
      icon={Zap}
      title={
        <>
          Autopilot
          {open ? null : <Pill tone="violet">After launch month</Pill>}
        </>
      }
      value={
        <>
          {!locked
            ? `Unlocked: ${autopilot.mergedCount} merged through GitRanks`
            : autopilot.lockedAt
              ? `Locked on ${dayLabel(autopilot.lockedAt)} · ${progress} of ${AUTOPILOT_UNLOCK_AT} merged since`
              : `${progress} of ${AUTOPILOT_UNLOCK_AT} merged PRs toward unlocking`}
          {open && autopilot.noticeTo ? (
            <span data-autopilot-notice-to className="block">
              Emails before each submission go to {autopilot.noticeTo}
            </span>
          ) : null}
          {open && noEmail && !locked && canSave && !error ? (
            <span data-autopilot-no-email className="block text-warning">
              {checked ? NO_EMAIL_ON : NO_EMAIL}
            </span>
          ) : null}
          {error ? (
            <span role="alert" className="block text-destructive">
              {error}
            </span>
          ) : null}
          <HowItWorksDialog autopilot={autopilot} trigger={howItWorksLink()} />
        </>
      }
      data={{
        'data-autopilot': locked ? 'locked' : 'unlocked',
        'data-autopilot-available': autopilot.available === undefined ? 'unknown' : String(autopilot.available),
      }}
    >
      <AutopilotConfirm
        autopilot={autopilot}
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={() => toggle(true)}
      />
      <label
        htmlFor={`${id}-autopilot`}
        className={cn('flex items-center gap-2.5 text-sm', !canTurnOn && 'text-muted-foreground')}
      >
        <input
          id={`${id}-autopilot`}
          type="checkbox"
          checked={checked}
          disabled={pending || !canSave || (!canTurnOn && !checked)}
          onChange={(event) => change(event.target.checked)}
          aria-label="Autopilot"
          className="size-4.5 accent-primary"
        />
        {checked ? 'On' : open && locked ? 'Locked' : 'Off'}
      </label>
    </SettingsRow>
  );
}

/**
 * The user's autopilot record: merged through GitRanks, still needed to unlock, closed without merging in a row, and the
 * unlock progress. How it works is the dialog's (`AutopilotHowItWorks`), so nothing is said twice.
 */
export function AutopilotRecord({ autopilot }: { autopilot: ContributeAutopilot }) {
  const { locked, toUnlock, progress, streak } = recordOf(autopilot);
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
          <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
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
      ) : (
        <span className="text-sm text-muted-foreground">
          Unlocked: {autopilot.mergedCount} of your pull requests were merged through GitRanks.
        </span>
      )}
    </div>
  );
}

/**
 * The link by the setting that opens how autopilot works (autopilot limits spec §4.1): an element, not a component, so
 * the dialog's trigger gives the button itself its click and its ARIA.
 */
function howItWorksLink() {
  return (
    <button type="button" data-autopilot-how className="block text-sm font-semibold text-link hover:underline">
      How autopilot works
    </button>
  );
}

/** "How autopilot works", opened by `trigger`: the full description, then the user's record. */
function HowItWorksDialog({ autopilot, trigger }: { autopilot: ContributeAutopilot; trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How autopilot works</DialogTitle>
          <DialogDescription>
            Autopilot submits a pull request for you, without your review, when the change is ready. It stays off until
            you turn it on.
          </DialogDescription>
        </DialogHeader>
        <AutopilotHowItWorks autopilot={autopilot} />
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
export function AutopilotHowItWorks({ autopilot }: { autopilot: ContributeAutopilot }) {
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
          from that email to stop it: from the email, the contribution’s page or My contributions. If the email can’t be
          sent, it waits for your review.
        </HowText>
      </HowSection>
      <HowSection title="What it never does">
        <ul className="ml-4 list-disc text-sm text-muted-foreground">
          <li>
            Submit on beginner issues (labels such as good first issue, first-timers-only, newcomers, easy): those wait
            for your review.
          </li>
          <li>
            Submit on a repository whose maintainers don’t allow autopilot: it waits for your review, and says which
            rule.
          </li>
          <li>Pick issues: you start every run.</li>
          <li>Post a reply you didn’t approve.</li>
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
          The pull request’s footer says “Opened by @you’s autopilot, not reviewed by a human”. It is still your pull
          request.
        </HowText>
      </HowSection>
      <HowSection title="Unlock and lock">
        <HowText>
          It unlocks after {AUTOPILOT_UNLOCK_AT} of your pull requests are merged through GitRanks. {AUTOPILOT_LOCK_AT}{' '}
          closed without merging in a row lock it again.
        </HowText>
      </HowSection>
    </div>
  );
}

/** The six lines of the confirmation (autopilot limits spec §4.3). */
export const AUTOPILOT_CONFIRM_LINES = [
  'Only changes that passed every check and that the agent rated low risk.',
  'We email you an hour before each one, so you can stop it.',
  'Never on beginner issues, or on repositories that don’t allow autopilot: those still wait for your review.',
  `Up to ${AUTOPILOT_FOLLOW_UPS_MAX} follow-up runs per pull request, on your key.`,
  'The pull request says your autopilot opened it, not reviewed by a human.',
  `${AUTOPILOT_LOCK_AT} pull requests closed without merging in a row turn it off.`,
];

/** "Turn on autopilot?": what changes, and a link to read more; Cancel keeps it off (autopilot limits spec §4.3). */
function AutopilotConfirm({
  autopilot,
  open,
  onOpenChange,
  onConfirm,
}: {
  autopilot: ContributeAutopilot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-autopilot-confirm>
        <AlertDialogHeader>
          <AlertDialogTitle>Turn on autopilot?</AlertDialogTitle>
          <AlertDialogDescription>Autopilot submits pull requests for you, without your review.</AlertDialogDescription>
        </AlertDialogHeader>
        <AutopilotConfirmLines />
        <HowItWorksDialog autopilot={autopilot} trigger={howItWorksLink()} />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="button" onClick={onConfirm}>
            Turn on autopilot
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
