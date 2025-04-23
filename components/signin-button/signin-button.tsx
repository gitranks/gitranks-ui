'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { LogIn } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';

import { getInitials } from '@/utils/get-initials';

import { Button } from '../ui/button';

export default function SigninButton() {
  const { data: session } = useSession();

  console.log('session', session);

  return (
    <div>
      {session ? (
        <Avatar onClick={() => signOut()} className="cursor-pointer">
          <AvatarImage src={session.user.image!} className="rounded-full" width={32} height={32} />
          <AvatarFallback>{getInitials(session.user.name!)}</AvatarFallback>
        </Avatar>
      ) : (
        <Button onClick={() => signIn('github')} variant="ghost" size="sm">
          <LogIn className="size-4" />
        </Button>
      )}
    </div>
  );
}
