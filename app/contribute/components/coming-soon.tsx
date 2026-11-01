'use client';

import { BellIcon, CheckIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiCursorAiFill, RiGeminiLine, RiGrokAiFill, RiOpenaiFill } from 'react-icons/ri';
import { SiGithubcopilot, SiGooglejules } from 'react-icons/si';
import { toast } from 'sonner';

import { noteProviderInterest, withdrawProviderInterest } from '../actions';
import { SignInButton } from './sign-in-dialog';
import type { ContributeComingSoonProvider } from '@/lib/contribute/contribute.types';
import type { LandingViewer } from '@/lib/contribute/contribute-state';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { COMING_SOON } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

type Noted = ReadonlySet<ContributeComingSoonProvider>;

/** Each card's mark; a provider without one shows its initials. */
export const PROVIDER_ICONS: Partial<Record<ContributeComingSoonProvider, IconType>> = {
  CHATGPT: RiOpenaiFill,
  COPILOT: SiGithubcopilot,
  GEMINI: RiGeminiLine,
  CURSOR: RiCursorAiFill,
  JULES: SiGooglejules,
  OPENAI: RiOpenaiFill,
  XAI: RiGrokAiFill,
};

const EMAIL_ONCE = "We'll email you once, when it opens";

/** The header's note beside the title: a visitor is asked to sign in first. */
export const comingSoonNoteOf = (viewer: LandingViewer) =>
  viewer === 'visitor' ? 'Sign in with GitHub to be told when one opens' : EMAIL_ONCE;

/** Overview's one line of what is coming: the first two, and how many more. */
export function comingSoonLineOf(): string {
  const [first, second, ...rest] = COMING_SOON.map(({ title }) => title);
  const more = rest.length ? ` and ${rest.length} more` : '';
  return `your ${[first, second].filter(Boolean).join(', ')}${more}.`;
}

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
  'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4',
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-450 motion-safe:ease-out motion-safe:fill-mode-both',
  // On a phone the cards are rows of one bordered list: the name and the button on a line, the text below.
  'max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-2.5 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:p-3.5 max-sm:last:border-b-0',
);

// Styled here rather than with the shared Button, whose transition is not behind motion-safe.
const BUTTON =
  'inline-flex min-h-10 items-center gap-1.5 self-start rounded-lg border px-3 text-sm font-semibold motion-safe:transition-colors max-sm:ml-auto max-sm:self-center';
const BUTTON_IDLE = 'bg-background text-foreground hover:bg-accent';
const BUTTON_ON = 'border-primary/40 bg-brand-soft text-brand-soft-foreground hover:bg-primary/10';

/** The user's list, the cards with a call in flight, and the press that flips one. */
function useNotify(initial: readonly ContributeComingSoonProvider[]) {
  const [noted, setNoted] = useState<Noted>(() => new Set(initial));
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
  return { noted, busy, flip };
}

/** A signed-in user's "Notify me": on the list, or not, with the check while it is. */
function NotifyToggle({
  title,
  on,
  busy,
  onClick,
  className,
}: {
  title: string;
  on: boolean;
  busy: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-busy={busy || undefined}
      aria-label={`Notify me when ${title} opens`}
      onClick={onClick}
      className={cn(BUTTON, on ? BUTTON_ON : BUTTON_IDLE, className)}
    >
      {on ? (
        <span aria-hidden="true" className="inline-flex motion-safe:animate-contribute-pop">
          <CheckIcon strokeWidth={2.6} className="size-3.75" />
        </span>
      ) : (
        <BellIcon aria-hidden="true" className="size-3.75" />
      )}
      {on ? 'On the list' : 'Notify me'}
    </button>
  );
}

function ProviderMark({
  provider,
  mono,
  className,
  iconClassName,
}: {
  provider: ContributeComingSoonProvider;
  mono: string;
  className: string;
  iconClassName: string;
}) {
  const Icon = PROVIDER_ICONS[provider];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex flex-none items-center justify-center rounded-md bg-muted font-bold text-foreground/80',
        className,
      )}
    >
      {Icon ? <Icon className={iconClassName} /> : mono}
    </span>
  );
}

/**
 * The providers that are coming, each with a "Notify me" that counts towards which comes first. A visitor's opens the
 * sign-in; a signed-in user's puts the provider on their list, or takes it off. `noted`: the user's list as the API
 * keeps it. `compact`: Overview's, inside "Ways you contribute": one line of what is coming, its "Notify me" opening
 * the mark, the title and the toggle of each, for a signed-in user.
 */
export function ComingSoon({
  viewer,
  preview = false,
  noted: initial = [],
  variant = 'landing',
}: {
  viewer: LandingViewer;
  preview?: boolean;
  noted?: readonly ContributeComingSoonProvider[];
  variant?: 'landing' | 'compact';
}) {
  const visitor = viewer === 'visitor';
  const { noted, busy, flip } = useNotify(visitor ? [] : initial);
  const [open, setOpen] = useState(false);
  const listId = useId();

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-dashed px-4 py-3" data-overview="coming-soon">
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>
            <h3 className="inline font-semibold text-foreground">Coming soon:</h3> {comingSoonLineOf()}
          </span>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-10 items-center font-semibold text-link hover:underline max-sm:min-h-11"
          >
            {open ? 'Hide' : 'Notify me →'}
          </button>
        </div>
        <div id={listId} hidden={!open} className="flex flex-col gap-2.5">
          <p className="text-sm text-muted-foreground">Tell us which you&apos;d use; the most asked for comes first.</p>
          {/* Four from 1280: at 1024 a quarter of the row leaves a title a few letters beside the toggle. */}
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {COMING_SOON.map(({ provider, mono, title }) => (
              <li
                key={provider}
                data-provider={provider}
                className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5"
              >
                <ProviderMark provider={provider} mono={mono} className="size-7 text-xs" iconClassName="size-4" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                <NotifyToggle
                  title={title}
                  on={noted.has(provider)}
                  busy={busy.has(provider)}
                  onClick={() => flip(provider)}
                  className="flex-none self-center px-2.5 max-sm:min-h-11"
                />
              </li>
            ))}
          </ul>
        </div>
        {/* Empty, it takes back the gap above it, and stays in place to announce the list. */}
        <p role="status" className="text-sm text-foreground/80 empty:-mt-2.5">
          {comingSoonStatusOf(noted)}
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="coming-soon-title" className="border-b" data-landing="coming-soon">
      <div className="mx-auto w-full max-w-7xl px-4 flex flex-col gap-6 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex max-w-3xl flex-col gap-2">
            <span className="text-xs font-semibold text-primary">Coming soon</span>
            <h2 id="coming-soon-title" className="text-2xl font-bold tracking-tight">
              More ways to spend credits you already have
            </h2>
            <p className="text-muted-foreground">
              Other AI plans and keys, with the same review before anything is sent. Tell us which one you'd use: we
              count every request, and the most asked for comes first.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{comingSoonNoteOf(viewer)}</span>
        </div>

        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 max-sm:gap-0 max-sm:overflow-hidden max-sm:rounded-xl max-sm:border">
          {COMING_SOON.map(({ provider, mono, title, kind, text }, index) => (
            <li key={provider} className={cn(CARD, RISE_DELAYS[index])} data-provider={provider}>
              <div className="flex min-w-0 items-center gap-3">
                <ProviderMark provider={provider} mono={mono} className="size-8.5 text-xs" iconClassName="size-4.5" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{title}</span>
                  <span className="text-xs text-muted-foreground">{kind}</span>
                </span>
              </div>
              <span className="flex-1 text-sm text-foreground/80 max-sm:order-3 max-sm:basis-full max-sm:pl-11.5">
                {text}
              </span>
              {visitor ? (
                <SignInButton
                  preview={preview}
                  label={`Notify me when ${title} opens`}
                  className={cn(BUTTON, BUTTON_IDLE)}
                >
                  <BellIcon aria-hidden="true" className="size-3.75" />
                  Notify me
                </SignInButton>
              ) : (
                <NotifyToggle
                  title={title}
                  on={noted.has(provider)}
                  busy={busy.has(provider)}
                  onClick={() => flip(provider)}
                />
              )}
            </li>
          ))}
        </ul>

        <p role="status" className="min-h-5 text-sm text-foreground/80">
          {visitor ? '' : comingSoonStatusOf(noted)}
        </p>
      </div>
    </section>
  );
}
