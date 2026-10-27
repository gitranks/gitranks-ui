'use client';

import { TriangleAlert } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PRIVACY_COPY as COPY } from './privacy-copy';
import { Link } from '@/components/link/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { CONTACT_EMAIL } from '@/lib/legal';
import type { DataRemovalStatus } from '@/types/data-removal.types';
import { loginFromPath } from '@/utils/login-from-path';

const isOwner = (sessionLogin: string | undefined, login: string) =>
  !!sessionLogin && sessionLogin.toLowerCase() === loginFromPath(login).toLowerCase();

/** The Privacy tab's body: what GitRanks holds, and the removal, for the signed-in owner only. */
export function PrivacyPanel({ login }: { login: string }) {
  const { data: session, status } = useSession();
  const owner = isOwner(session?.user.githubLogin, login);
  const [removed, setRemoved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!owner) return;
    fetch('/api/me/data-removal')
      .then((res) => (res.ok ? (res.json() as Promise<DataRemovalStatus>) : null))
      .then((data) => setRemoved(data?.removed ?? false))
      .catch(() => setRemoved(false));
  }, [owner]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16">
      <h1 className="text-2xl font-semibold">{removed ? COPY.removedTitle : COPY.title}</h1>
      {status === 'loading' ? null : !session ? (
        <div className="flex flex-col items-start gap-4">
          <p>{COPY.signedOut}</p>
          <Button onClick={() => signIn(IDENTITY_PROVIDER)}>Sign in with GitHub</Button>
          <EmailNote />
        </div>
      ) : !owner ? (
        <p>{COPY.notOwner(loginFromPath(login))}</p>
      ) : removed ? (
        <RemovedPanel login={session.user.githubLogin as string} />
      ) : (
        <OwnerPanel login={session.user.githubLogin as string} ready={removed !== null} />
      )}
    </main>
  );
}

function EmailNote() {
  return (
    <p className="text-sm text-muted-foreground">
      {COPY.emailNote} <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link> ·{' '}
      <Link href="/privacy#removal">How removal works</Link>
    </p>
  );
}

/**
 * A removed account signed in again: GitRanks holds nothing but that new sign-in, which can go the same way (the
 * removal runs again and finds only it).
 */
function RemovedPanel({ login }: { login: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-4">
      <p>
        {COPY.removedText} <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>
      </p>
      <p>{COPY.signInAgain}</p>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        {COPY.removeSignIn}
      </Button>
      <RemovalDialog login={login} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function OwnerPanel({ login, ready }: { login: string; ready: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-4">
      <p>{COPY.intro}</p>
      <div className="flex flex-col gap-2">
        <p>Removing it deletes:</p>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          {COPY.removes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">
        What stays, and why: <Link href="/privacy#removal">Privacy policy</Link>.
      </p>
      <Button variant="destructive" disabled={!ready} onClick={() => setOpen(true)}>
        {COPY.button}
      </Button>
      <RemovalDialog login={login} open={open} onOpenChange={setOpen} />
    </div>
  );
}

/** The confirmation: a bold warning, the login typed in, then the removal and a sign-out. */
export function RemovalDialog({
  login,
  open,
  onOpenChange,
}: {
  login: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [typed, setTyped] = useState('');
  const [removing, setRemoving] = useState(false);
  const matches = typed.trim().toLowerCase() === login.toLowerCase();

  // The confirmation is typed each time: a cancelled dialog opens empty again.
  const close = () => {
    if (removing) return;
    setTyped('');
    onOpenChange(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!matches || removing) return;
    setRemoving(true);
    try {
      const res = await fetch('/api/me/data-removal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: typed.trim() }),
      });
      if (!res.ok) {
        toast.error(COPY.failed);
        setRemoving(false);
        return;
      }
      await signOut({ redirectTo: '/data-removed' });
    } catch {
      toast.error(COPY.failed);
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      {/* An alert dialog: a destructive step the user confirms. */}
      <DialogContent role="alertdialog">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{COPY.dialogTitle}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-left text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
                {/* The colour on the text itself: the description's own muted colour would win over the box's. */}
                <strong className="font-bold text-destructive">{COPY.warning}</strong>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-login">{COPY.confirmLabel(login)}</Label>
            <Input
              id="confirm-login"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={removing}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={removing} onClick={close}>
              {COPY.cancel}
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || removing}>
              {removing ? COPY.removing : COPY.confirmButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
