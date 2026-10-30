'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { SignInButton } from './sign-in-dialog';
import { wideMenuItemClass } from '@/components/header/components/menu-styles';
import { PhoneMenu } from '@/components/header/components/phone-menu';
import { Header } from '@/components/header/header';
import SigninButton from '@/components/signin-button/signin-button';
import { buttonVariants } from '@/components/ui/button';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { isMaintainersPath } from '@/lib/contribute/contribute-path';
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

/** Who is looking, as the bar needs it. */
export type ContributeBarViewer = {
  signedIn: boolean;
  onboarded: boolean;
};

/** What the bar holds for a viewer on a path. */
export type ContributeBarState = {
  /** The tabs, as the header's menu: only once the user is onboarded. */
  tabs: boolean;
  /** The tab marked as the current page. */
  current?: Route;
  /** The account: the site's avatar menu, "Sign in" (the sign-in dialog), or nothing. */
  account: 'avatar' | 'sign-in' | 'none';
};

/**
 * The bar for a viewer on a path. Not onboarded, Contribute is one page and has no tabs. `?as=visitor` on `/contribute`
 * shows a signed-in user the visitor's bar. The maintainers page, open to everyone, has no tabs and no Contribute
 * sign-in (it has its own).
 */
export function contributeBarOf(pathname: string, as: string | null, viewer: ContributeBarViewer): ContributeBarState {
  const maintainers = isMaintainersPath(pathname);
  const visitor = !viewer.signedIn || (pathname.replace(/\/+$/, '') === '/contribute' && isAsVisitor(as));
  const tabs = viewer.onboarded && !visitor && !maintainers;
  return {
    tabs,
    current: tabs ? contributeTabOf(pathname) : undefined,
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
 * Contribute's top bar: the site header, titled "contribute" as a profile is titled with its login, with the tabs as
 * its menu once onboarded and the account. Without props it is the stand-in while the viewer is read: no tabs, no
 * account.
 */
export function ContributeBarView({
  tabs = false,
  current,
  account = 'none',
  preview = false,
}: Partial<ContributeBarState> & {
  /** A signed-in user seeing the visitor's bar: its sign-in only goes on. */
  preview?: boolean;
}) {
  return (
    <Header
      title="contribute"
      menu={tabs ? <ContributeMenu current={current} /> : null}
      account={
        account === 'sign-in' ? (
          <SignInButton
            preview={preview}
            className={buttonVariants({ variant: 'outline', className: 'font-semibold' })}
          >
            Sign in
          </SignInButton>
        ) : account === 'avatar' ? (
          <SigninButton />
        ) : null
      }
    />
  );
}

/**
 * The tabs as the header's menu items: in the row from `lg` up (four tabs and the title need the room), in the menu's
 * panel below it. The current one is filled and the others muted, so a hovered tab never reads as the current one.
 */
function ContributeMenu({ current }: { current?: Route }) {
  return (
    <PhoneMenu aria-label="Contribute" breakpoint="lg">
      {CONTRIBUTE_TABS.map(({ href, label }) => {
        const active = current === href;
        return (
          <NavigationMenuItem key={href}>
            <NavigationMenuLink
              asChild
              active={active}
              className={cn(
                wideMenuItemClass,
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground focus:text-foreground',
              )}
            >
              <Link href={href} prefetch={false}>
                {label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        );
      })}
    </PhoneMenu>
  );
}
