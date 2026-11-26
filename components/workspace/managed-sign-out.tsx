'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { signOutHere } from '@/lib/sign-out';

/** "Sign out" for a company-managed account: the page then draws for a visitor, whose buttons sign in again. */
export function ManagedSignOut({ className }: { className?: string }) {
  return (
    <Button type="button" className={className} onClick={() => signOutHere()} data-managed-sign-out="">
      <LogOut aria-hidden="true" className="size-4" />
      Sign out
    </Button>
  );
}
