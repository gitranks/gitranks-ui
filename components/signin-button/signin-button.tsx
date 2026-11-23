'use client';
import { LogIn } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from '@/lib/auth-providers';
import { forgetHeroApplication } from '@/lib/unsung-hero/hero-application-cookie';

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

/** Signing out forgets the browser's note of an open application, so the next account does not see it. */
const signOutHere = () => {
  forgetHeroApplication();
  return signOut();
};

export default function SigninButton() {
  const { data: session } = useSession();

  return (
    <div>
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Image
              src={`${session.user.image}&s=${AVATAR_SIZE * 2}`}
              alt={`${session.user.name} avatar`}
              className="rounded-full"
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              loading="lazy"
              decoding="async"
            />
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
        <Button onClick={() => signIn(IDENTITY_PROVIDER)} variant="ghost" size="sm">
          <LogIn className="size-4" />
        </Button>
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
