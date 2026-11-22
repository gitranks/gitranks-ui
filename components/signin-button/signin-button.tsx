'use client';
import { LogIn } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from '@/lib/auth-providers';
import { forgetHeroApplication, hasHeroApplication } from '@/lib/unsung-hero/hero-application-cookie';
import { UNSUNG_HERO_APPLY_PATH } from '@/lib/unsung-hero/unsung-hero';

const AVATAR_SIZE = 32;

/** The menu's Unsung hero item, by whether this browser notes an open application for the signed-in login. */
export const heroMenuItemText = (applied: boolean) =>
  applied ? 'Your Unsung hero application' : 'Apply for Unsung hero';

/** Signing out forgets the browser's note of an open application, so the next account does not see it. */
const signOutHere = () => {
  forgetHeroApplication();
  return signOut();
};

export default function SigninButton() {
  const { data: session } = useSession();
  // Read when the menu opens, so a send or a cancel on the apply page shows at once.
  const [applied, setApplied] = useState(false);

  return (
    <div>
      {session ? (
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) setApplied(hasHeroApplication(document.cookie, session.user?.githubLogin));
          }}
        >
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
            <DropdownMenuItem asChild>
              <Link href={UNSUNG_HERO_APPLY_PATH as Route} prefetch={false}>
                {heroMenuItemText(applied)}
              </Link>
            </DropdownMenuItem>
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
