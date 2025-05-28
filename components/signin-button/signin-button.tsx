'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

import { getInitials } from '@/utils/get-initials';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export default function SigninButton() {
  const { data: session } = useSession();

  console.log('session', session);

  return (
    <div>
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src={session.user.image!} className="rounded-full" width={32} height={32} />
              <AvatarFallback>{getInitials(session.user.name!)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/profile/${session?.user?.githubLogin}`}>Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button onClick={() => signIn('github')} variant="ghost" size="sm">
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
            <Button type="button" variant="secondary" onClick={() => signOut()}>
              Maybe later
            </Button>
            <Button onClick={() => signIn('github')}>Sign in again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
