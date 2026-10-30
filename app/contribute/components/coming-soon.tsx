'use client';

import { BellIcon, CheckIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { noteProviderInterest, withdrawProviderInterest } from '../actions';
import { SignInButton } from './sign-in-dialog';
import type { ContributeComingSoonProvider } from '@/lib/contribute/contribute.types';
import type { LandingViewer } from '@/lib/contribute/contribute-state';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { COMING_SOON } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

type Noted = ReadonlySet<ContributeComingSoonProvider>;

const EMAIL_ONCE = "We'll email you once, when it opens";

/** The header's note beside the title: a visitor is asked to sign in first. */
export const comingSoonNoteOf = (viewer: LandingViewer) =>
  viewer === 'visitor' ? 'Sign in with GitHub to be told when one opens' : EMAIL_ONCE;

/** What the user is on the list for, among the cards shown; '' for none. */
export function comingSoonStatusOf(noted: Noted): string {
  const titles = COMING_SOON.filter(({ provider }) => noted.has(provider)).map(({ title }) => title);
  if (titles.length === 0) return '';
  if (titles.length === 1) return `You're on the list for ${titles[0]}. ${EMAIL_ONCE}.`;
  return `You're on the list for ${titles.length} of these. We'll email you once, when each one opens.`;
}

/** `noted` with `provider` on the list (`on`) or off it. */
export function withInterest(noted: Noted, provider: ContributeComingSoonProvider, on: boolean): Noted {
  const next = new Set(noted);
  if (on) next.add(provider);
  else next.delete(provider);
  return next;
}

/**
 * Puts `provider` on the list (`on`) or takes it off: the card changes at once, and back again with a toast when the
 * call fails or never answers (offline, or a deploy under way). True when the call went through.
 */
export async function flipInterest(
  provider: ContributeComingSoonProvider,
  on: boolean,
  update: (change: (noted: Noted) => Noted) => void,
): Promise<boolean> {
  update((noted) => withInterest(noted, provider, on));
  let message: string;
  try {
    const result = await (on ? noteProviderInterest(provider) : withdrawProviderInterest(provider));
    if (result.ok) return true;
    message = contributeErrorMessage(result.error, result.message);
  } catch {
    message = contributeErrorMessage('FAILED');
  }
  update((noted) => withInterest(noted, provider, !on));
  toast.error(message);
  return false;
}

/** The cards rise in one after another, 50ms apart. */
const RISE_DELAYS = [
  'motion-safe:delay-0',
  'motion-safe:delay-50',
  'motion-safe:delay-100',
  'motion-safe:delay-150',
  'motion-safe:delay-200',
  'motion-safe:delay-250',
  'motion-safe:delay-300',
  'motion-safe:delay-350',
];

const CARD = cn(
  'flex min-w-0 flex-col gap-3 rounded-[14px] border bg-card p-4',
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-450 motion-safe:ease-out motion-safe:fill-mode-both',
  // On a phone the cards are rows of one bordered list: the name and the button on a line, the text below.
  'max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-2.5 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:p-3.5 max-sm:last:border-b-0',
);

const BUTTON =
  'inline-flex min-h-10 items-center gap-1.5 self-start rounded-[10px] border px-3 text-sm font-semibold motion-safe:transition-colors max-sm:ml-auto max-sm:self-center';
const BUTTON_IDLE = 'border-zinc-300 bg-background text-foreground hover:bg-accent dark:border-zinc-700';
const BUTTON_ON =
  'border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-950';

/**
 * The providers that are coming, each with a "Notify me" that counts towards which comes first. A visitor's opens the
 * sign-in; a signed-in user's puts the provider on their list, or takes it off. `noted`: the user's list as the API
 * keeps it.
 */
export function ComingSoon({
  viewer,
  preview = false,
  noted: initial = [],
}: {
  viewer: LandingViewer;
  preview?: boolean;
  noted?: readonly ContributeComingSoonProvider[];
}) {
  const visitor = viewer === 'visitor';
  const [noted, setNoted] = useState<Noted>(() => new Set(visitor ? [] : initial));
  // A card's call in flight: its button is busy and another press of it is ignored, so a failure rolls back the right
  // state.
  const inFlight = useRef(new Set<ContributeComingSoonProvider>());
  const [busy, setBusy] = useState<Noted>(() => new Set());

  const flip = (provider: ContributeComingSoonProvider) => {
    if (inFlight.current.has(provider)) return;
    inFlight.current.add(provider);
    setBusy((current) => withInterest(current, provider, true));
    void flipInterest(provider, !noted.has(provider), setNoted).finally(() => {
      inFlight.current.delete(provider);
      setBusy((current) => withInterest(current, provider, false));
    });
  };

  return (
    <section aria-labelledby="coming-soon-title" className="border-b" data-landing="coming-soon">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex max-w-[720px] flex-col gap-2">
            <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">Coming soon</span>
            <h2 id="coming-soon-title" className="text-[22px] font-extrabold tracking-[-0.01em] sm:text-[26px]">
              More ways to spend credits you already have
            </h2>
            <p className="text-muted-foreground">
              Other AI plans and keys, with the same review before anything is sent. Tell us which one you'd use: we
              count every request, and the most asked for comes first.
            </p>
          </div>
          <span className="text-[13px] text-muted-foreground">{comingSoonNoteOf(viewer)}</span>
        </div>

        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 max-sm:gap-0 max-sm:overflow-hidden max-sm:rounded-[14px] max-sm:border">
          {COMING_SOON.map(({ provider, mono, title, kind, text }, index) => {
            const on = noted.has(provider);
            return (
              <li key={provider} className={cn(CARD, RISE_DELAYS[index])} data-provider={provider}>
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-[34px] flex-none items-center justify-center rounded-[9px] bg-muted text-[13px] font-bold text-foreground/80"
                  >
                    {mono}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{title}</span>
                    <span className="text-xs text-muted-foreground">{kind}</span>
                  </span>
                </div>
                <span className="flex-1 text-sm text-foreground/80 max-sm:order-3 max-sm:basis-full max-sm:pl-[46px]">
                  {text}
                </span>
                {visitor ? (
                  <SignInButton
                    preview={preview}
                    label={`Notify me when ${title} opens`}
                    className={cn(BUTTON, BUTTON_IDLE)}
                  >
                    <BellIcon aria-hidden="true" className="size-[15px]" />
                    Notify me
                  </SignInButton>
                ) : (
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-busy={busy.has(provider) || undefined}
                    aria-label={`Notify me when ${title} opens`}
                    onClick={() => flip(provider)}
                    className={cn(BUTTON, on ? BUTTON_ON : BUTTON_IDLE)}
                  >
                    {on ? (
                      <span aria-hidden="true" className="inline-flex motion-safe:animate-contribute-pop">
                        <CheckIcon strokeWidth={2.6} className="size-[15px]" />
                      </span>
                    ) : (
                      <BellIcon aria-hidden="true" className="size-[15px]" />
                    )}
                    {on ? 'On the list' : 'Notify me'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <p role="status" className="min-h-5 text-sm text-foreground/80">
          {visitor ? '' : comingSoonStatusOf(noted)}
        </p>
      </div>
    </section>
  );
}
