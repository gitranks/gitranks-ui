'use client';

import { CheckIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { type ReactNode, useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { CONNECT_AGENT_PATH, CONNECT_KEY_PATH } from '@/lib/contribute/contribute-path';

/** The way of contributing a visitor picked: a Claude key, or their own agent. */
export type SignInPath = 'key' | 'agent';

const PATHS: Record<SignInPath, { label: string; route: Route }> = {
  key: { label: 'Your Claude key', route: CONNECT_KEY_PATH },
  agent: { label: 'Your own agent', route: CONNECT_AGENT_PATH },
};

/** Where the sign-in brings the visitor back: the first step of the way they picked, or the landing. */
export const signInRouteOf = (path?: SignInPath): Route => (path ? PATHS[path].route : '/contribute');

/** The identity sign-in (read-only profile and email), back to the way the visitor picked. */
export const startSignIn = (path?: SignInPath) => signIn(IDENTITY_PROVIDER, { redirectTo: signInRouteOf(path) });

const CONTINUE_CLASS =
  'inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[10px] bg-foreground px-5 font-semibold text-background transition-colors hover:bg-foreground/85 disabled:opacity-60';

/**
 * A visitor's action button: it opens the sign-in over the page. The dialog holds focus while open, closes on Escape,
 * and gives focus back to this button.
 */
export function SignInButton({
  path,
  preview = false,
  className,
  children,
}: {
  path?: SignInPath;
  /** A signed-in user seeing the visitor's page: the sign-in only goes on to the next step. */
  preview?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-5 rounded-[18px] p-8 shadow-2xl motion-reduce:animate-none sm:max-w-[440px] max-sm:rounded-2xl max-sm:p-6"
      >
        <SignInPanel path={path} preview={preview} onLeave={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** What the sign-in shares and what it does not, and the button that starts it. Rendered inside the dialog. */
export function SignInPanel({
  path,
  preview = false,
  onLeave,
}: {
  path?: SignInPath;
  preview?: boolean;
  /** Closes the dialog as the preview's button goes on: from the bar, the page under it stays. */
  onLeave?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const route = signInRouteOf(path);
  const continueWithGithub = (
    <>
      <FaGithub aria-hidden="true" className="size-5" />
      Continue with GitHub
    </>
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-violet-700 dark:text-violet-300">
          {path ? PATHS[path].label : 'GitRanks Contribute'}
        </span>
        <DialogTitle className="text-2xl leading-tight font-extrabold">Sign in to continue</DialogTitle>
        <DialogDescription className="text-base leading-normal text-foreground/80">
          We use your GitHub sign-in to match issues to the languages and repos on your profile. GitHub shares your
          public profile and email with us, read-only.
        </DialogDescription>
      </div>
      <ul className="flex flex-col gap-2.5 text-sm text-foreground/80">
        <li className="flex gap-2.5">
          <CheckIcon
            aria-hidden="true"
            strokeWidth={2.4}
            className="mt-px size-[18px] flex-none text-green-700 dark:text-green-400"
          />
          {path ? 'You come straight back, to the next step' : 'You come straight back here'}
        </li>
        <li className="flex gap-2.5">
          <CheckIcon
            aria-hidden="true"
            strokeWidth={2.4}
            className="mt-px size-[18px] flex-none text-green-700 dark:text-green-400"
          />
          No access to your repos. That's asked once, at your first submit
        </li>
      </ul>
      {preview ? (
        // Signed in already: the button goes on to the step, as the sign-in would.
        <Link href={route} prefetch={false} className={CONTINUE_CLASS} data-sign-in="preview" onClick={onLeave}>
          {continueWithGithub}
        </Link>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={CONTINUE_CLASS}
          data-sign-in="github"
          onClick={() => {
            setPending(true);
            startSignIn(path).catch(() => setPending(false));
          }}
        >
          {continueWithGithub}
        </button>
      )}
      <DialogClose className="self-center rounded-sm text-sm font-semibold text-primary hover:underline">
        Not now
      </DialogClose>
    </>
  );
}
