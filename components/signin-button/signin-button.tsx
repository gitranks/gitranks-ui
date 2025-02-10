'use client';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function SigninButton() {
  const { data: session } = useSession();
  console.log('session', session);

  return (
    <div>
      {session ? (
        <div>
          <p>Signed in as {session.user?.email}</p>
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn('github')}>Sign in with GitHub</button>
      )}
    </div>
  );
}
