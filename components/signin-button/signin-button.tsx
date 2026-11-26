'use client';
import { LogIn } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from '@/lib/auth-providers';
import { signOutHere } from '@/lib/sign-out';

const AVATAR_SIZE = 32;

/**
 * Logins that see the admin links in the menu. Only a shortcut: the admin pages themselves are guarded by the API,
 * which answers them to its own admins and nobody else.
 */
const MENU_ADMIN_LOGINS: readonly string[] = ['maslianok'];

/** Whether the menu shows the admin links to this login (GitHub logins match in any case). */
export const showsAdminLinks = (login: string | null | undefined) =>
  !!login && MENU_ADMIN_LOGINS.some((admin) => admin.toLowerCase() === login.toLowerCase());

const UNSUNG_HERO_ADMIN_PATH = '/admin/unsung-hero';

/**
 * The box the header's right end holds, whatever is in it: the Sign in button's (36 by 32 px), so the avatar, its place
 * while the session is read and Sign in take the same room, and nothing beside them moves when one becomes another.
 */
const SLOT = 'h-8 w-9 items-center justify-center';

export default function SigninButton() {
  const { data: session, status } = useSession();

  return (
    <div>
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* A button, so the menu is reached with Tab and opened with Enter or Space; Escape closes it. */}
            <button
              type="button"
              aria-label="Your account"
              className={`flex ${SLOT} rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`}
            >
              <Image
                src={`${session.user.image}&s=${AVATAR_SIZE * 2}`}
                alt={`${session.user.name} avatar`}
                className="rounded-full"
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                loading="lazy"
                decoding="async"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/profile/${session?.user?.githubLogin}`} prefetch={false}>
                Profile
              </Link>
            </DropdownMenuItem>
            {showsAdminLinks(session.user?.githubLogin) && (
              <DropdownMenuItem asChild>
                <Link href={UNSUNG_HERO_ADMIN_PATH as Route} prefetch={false}>
                  Unsung hero admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => signOutHere()}>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          {/* While the session is read, the hint (set before the first paint) picks what is drawn. */}
          {status === 'loading' ? (
            <span aria-hidden="true" data-avatar-place="" className={`hidden [html[data-has-session]_&]:flex ${SLOT}`}>
              <span className="size-8 rounded-full bg-muted" />
            </span>
          ) : null}
          <Button
            onClick={() => signIn(IDENTITY_PROVIDER)}
            variant="ghost"
            size="sm"
            aria-label="Sign in"
            className={status === 'loading' ? '[html[data-has-session]_&]:hidden' : undefined}
          >
            <LogIn className="size-4" />
          </Button>
        </>
      )}

      <Dialog open={session?.error === 'RefreshTokenError'}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oops, Token Timeout!</DialogTitle>
            <DialogDescription>
              Your GitHub access token decided to take a break. Sign in again to get back to business.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => signOutHere()}>
              Maybe later
            </Button>
            <Button onClick={() => signIn(TOKEN_PROVIDER)}>Sign in again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
