'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

import { getInitials } from '@/utils/get-initials';

import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export default function SigninButton() {
  const { data: session } = useSession();

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
    </div>
  );
}
