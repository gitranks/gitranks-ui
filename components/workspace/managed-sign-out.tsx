'use client';

import { LogOut } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { signOutHere } from '@/lib/sign-out';

/**
 * "Sign out" for a company-managed account: signs out here, then opens GitHub's sign-in with its account picker, so the
 * person can choose their personal account (GitHub would otherwise sign the same account straight back in), and comes
 * back to this page.
 */
export function ManagedSignOut({ className }: { className?: string }) {
  const signOutAndPick = async () => {
    const here = `${window.location.pathname}${window.location.search}`;
    await signOutHere({ redirect: false });
    await signIn(IDENTITY_PROVIDER, { redirectTo: here }, { prompt: 'select_account' });
  };
  return (
    <Button type="button" className={className} onClick={() => void signOutAndPick()} data-managed-sign-out="">
      <LogOut aria-hidden="true" className="size-4" />
      Sign out
    </Button>
  );
}
