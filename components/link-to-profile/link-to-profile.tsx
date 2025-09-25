'use client';
import { signIn, useSession } from 'next-auth/react';

import { Link } from '@/components/link/link';

export const LinkToProfile = () => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <span>
        <Link href="#" onClick={() => signIn('github')}>
          Login
        </Link>{' '}
        to see your rank.
      </span>
    );
  }

  return (
    <span>
      <Link href={`/profile/${session.user.githubLogin}`}>Check your profile</Link> to see your rank
    </span>
  );
};
