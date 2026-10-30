'use client';

import { ChevronLeftIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { SignInButton } from './sign-in-dialog';
import SigninButton from '@/components/signin-button/signin-button';
import { buttonVariants } from '@/components/ui/button';
import { isMaintainersPath, MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { isAsVisitor } from '@/lib/contribute/contribute-state';
import { cn } from '@/lib/utils';

export const CONTRIBUTE_TABS: { href: Route; label: string }[] = [
  { href: '/contribute', label: 'Overview' },
  { href: '/contribute/issues', label: 'Issues for you' },
  { href: '/contribute/me', label: 'My contributions' },
  { href: '/contribute/settings', label: 'Settings' },
];

/** The tab a Contribute path belongs to: the connect flow to the overview, an attempt's review to My contributions. */
export const contributeTabOf = (pathname: string): Route | undefined => {
  const path = pathname.startsWith('/contribute/attempts/') ? '/contribute/me' : pathname;
  return CONTRIBUTE_TABS.findLast(({ href }) => path === href || path.startsWith(`${href}/`))?.href;
};

const isSettingsPath = (pathname: string) => contributeTabOf(pathname) === '/contribute/settings';

/** Who is looking, as the bar needs it. */
export type ContributeBarViewer = {
  signedIn: boolean;
  /** Contribute is open to them (the preview lets them in). */
  allowed: boolean;
  onboarded: boolean;
  /** They have a contributor record: Settings is theirs before they are onboarded too. */
  contributor: boolean;
};

/** What the bar holds for a viewer on a path. */
export type ContributeBarState = {
  /** Where the lockup goes. */
  home: Route;
  /** The tabs: only once the user is onboarded. */
  tabs: boolean;
  /** The tab (or the Settings link) marked as the current page. */
  current?: Route;
  /** A Settings link in place of the tabs: a contributor not onboarded yet keeps a way to their tokens and data. */
  settings: boolean;
  /** The account: the site's avatar menu, "Sign in" (the sign-in dialog), or nothing. */
  account: 'avatar' | 'sign-in' | 'none';
};

/**
 * The bar for a viewer on a path. Not onboarded, Contribute is one page and has no tabs. `?as=visitor` on `/contribute`
 * shows a signed-in user the visitor's bar. The maintainers page, open to everyone, has no tabs and no Contribute
 * sign-in (it has its own); its lockup leads to the landing only for a viewer Contribute is open to.
 */
export function contributeBarOf(pathname: string, as: string | null, viewer: ContributeBarViewer): ContributeBarState {
  const maintainers = isMaintainersPath(pathname);
  const visitor = !viewer.signedIn || (pathname.replace(/\/+$/, '') === '/contribute' && isAsVisitor(as));
  const tabs = viewer.onboarded && !visitor && !maintainers;
  const settings = !tabs && !visitor && !maintainers && viewer.contributor;
  return {
    home: maintainers && !viewer.allowed ? MAINTAINERS_PATH : '/contribute',
    tabs,
    current: tabs
      ? contributeTabOf(pathname)
      : settings && isSettingsPath(pathname)
        ? '/contribute/settings'
        : undefined,
    settings,
    account: maintainers ? (viewer.signedIn ? 'avatar' : 'none') : visitor ? 'sign-in' : 'avatar',
  };
}

/** The bar as the path and the query say; it reads both, so it renders inside a Suspense boundary. */
export function ContributeBarNav(viewer: ContributeBarViewer) {
  const pathname = usePathname();
  const as = useSearchParams().get('as');
  return <ContributeBarView {...contributeBarOf(pathname, as, viewer)} preview={viewer.signedIn} />;
}

/**
 * Contribute's own top bar, in place of the site header: the lockup, the tabs once onboarded, the way back to
 * GitRanks and the account. Without props it is the stand-in while the viewer is read: no tabs, no account.
 */
export function ContributeBarView({
  home = '/contribute',
  tabs = false,
  current,
  settings = false,
  account = 'none',
  preview = false,
}: Partial<ContributeBarState> & {
  /** A signed-in user seeing the visitor's bar: its sign-in only goes on. */
  preview?: boolean;
}) {
  return (
    <header className="border-b bg-background">
      {/* The site header's row: p-4 around 36px controls, 68px tall. */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-7 p-4 md:flex-nowrap">
        <Link
          href={home}
          prefetch={false}
          aria-label="GitRanks Contribute, home"
          className="flex flex-none flex-col leading-none"
        >
          <span className="text-lg font-bold tracking-tight">GitRanks</span>
          <span className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">Contribute</span>
        </Link>

        {tabs ? (
          // The tabs reach into the row's padding, so the current one's underline sits on the bar's bottom border.
          <nav
            aria-label="Contribute"
            className="flex gap-1 self-stretch text-sm max-md:order-3 max-md:-mb-4 max-md:basis-full max-md:overflow-x-auto md:-my-4"
          >
            {CONTRIBUTE_TABS.map(({ href, label }) => {
              const active = current === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center border-b-2 px-3 whitespace-nowrap transition-colors',
                    active
                      ? 'border-primary font-semibold text-foreground'
                      : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* The links keep a 44px target; -my-1 lets them sit in the 36px row. */}
        <div className="ml-auto flex h-9 items-center gap-4.5 text-sm">
          {settings ? (
            <Link
              href="/contribute/settings"
              prefetch={false}
              aria-current={current === '/contribute/settings' ? 'page' : undefined}
              className="-my-1 inline-flex min-h-11 items-center font-medium text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          ) : null}
          <Link
            href="/"
            prefetch={false}
            aria-label="Back to GitRanks"
            className="-my-1 inline-flex min-h-11 items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
            GitRanks
          </Link>
          {account === 'sign-in' ? (
            <SignInButton
              preview={preview}
              className={buttonVariants({ variant: 'outline', className: 'font-semibold' })}
            >
              Sign in
            </SignInButton>
          ) : account === 'avatar' ? (
            <SigninButton />
          ) : null}
        </div>
      </div>
    </header>
  );
}
