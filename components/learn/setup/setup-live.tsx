'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SetupFailed, type SetupNotice, SetupView, SetupVisitor } from './setup-parts';
import { useEnter, useFocusOnShow } from '@/components/learn/player/use-page-keys';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { LearnActionResult } from '@/lib/learn/learn-action';
import { LEARN_SETUP_MINE_PATH, LEARN_SETUP_PATH } from '@/lib/learn/paths';
import {
  type LearnSetupRead,
  missingOf,
  pendingSetupForm,
  type SetupForm,
  type SetupPick,
  type SetupStarts,
  setupDestinationOf,
  setupFormAfter,
  setupFormPick,
  setupFormUnread,
  setupInputOfForm,
  setupReadOf,
} from '@/lib/learn/setup';
import { saveLearnSetupAction, startLearnSetupGuessAction } from '@/lib/learn/setup.actions';
import { readPicked } from '@/lib/learn/use-example-language';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import { hasSessionHint } from '@/lib/session-hint';

/** How often the setup is read again while our guess runs, and how many times at most. */
export const SETUP_POLL_MS = 2000;
export const SETUP_POLLS = 15;

/**
 * The person's setup from its route: `'signed-out'` when the session is gone or needs a new sign-in; null when there is
 * none (Learn not open to them), and on any failure.
 */
export async function readSetup(): Promise<LearnSetupRead | 'signed-out' | null> {
  try {
    const res = await fetch(LEARN_SETUP_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const { setup, signedOut } = (await res.json()) as { setup?: unknown; signedOut?: boolean };
    if (signedOut === true) return 'signed-out';
    return setupReadOf(setup);
  } catch {
    return null;
  }
}

/** Where the page stands besides its form: a visitor, a session that ended, a setup that did not come. */
type Page = 'form' | 'visitor' | 'ended' | 'failed';

/**
 * Set up Learn in the browser (page 5). The page is the person's own: once it is up, a person with a session reads
 * their setup, and a visitor is asked to sign in. With no setup yet our guess starts right here (the page may be the
 * person's very first Learn page), and the setup is read again every two seconds until the guess is in. A field the
 * person chose meanwhile is never filled by the guess. The save sends them where their level says to start; a setup
 * saved before is changed in place.
 */
export function SetupLive({ starts }: { starts: SetupStarts }) {
  const [page, setPage] = useState<Page>('form');
  const [form, setForm] = useState<SetupForm>(pendingSetupForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<SetupNotice | null>(null);
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();
  const hints = useKeyHints();
  const mainRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<HTMLInputElement>(null);
  const titleRef = useFocusOnShow<HTMLHeadingElement>(page !== 'form');
  // After "Try again" the button is gone: the form's title takes the focus, so the person's place is not lost.
  const formTitleRef = useFocusOnShow<HTMLHeadingElement>(page === 'form' && attempt > 0);
  // Once saved, a read still on its way changes nothing.
  const saved = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again reads the setup once more.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPage('visitor');
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async (polls: number) => {
      const setup = await readSetup();
      if (!live || saved.current) return;
      if (setup === 'signed-out') {
        setPage('ended');
        return;
      }
      if (!setup) {
        // The first read failing is the page's; a later one only ends the wait for our guess.
        if (polls === 0) setPage('failed');
        else setForm(setupFormUnread);
        return;
      }
      setForm((current) => setupFormAfter(current, setup, readPicked()));
      if (setup.state === 'NONE' && polls === 0) {
        const started = await startLearnSetupGuessAction().catch(() => null);
        if (!live || saved.current) return;
        if (!started?.ok || !started.data) {
          setForm(setupFormUnread);
          return;
        }
      } else if (setup.state === 'NONE') {
        // Our guess was dropped (the profile could not be read): the person fills the fields.
        setForm(setupFormUnread);
        return;
      }
      if (setup.state === 'GUESSED' || setup.state === 'SAVED') return;
      if (polls >= SETUP_POLLS) {
        setForm(setupFormUnread);
        return;
      }
      timer = setTimeout(() => void read(polls + 1), SETUP_POLL_MS);
    };
    void read(0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [attempt]);

  const destination = setupDestinationOf(form, starts);
  const pick = useCallback((change: SetupPick) => {
    setNotice(null);
    setForm((current) => setupFormPick(current, change));
  }, []);

  const save = useCallback(async () => {
    const input = setupInputOfForm(form);
    if (!input) {
      const fields = missingOf(form.values);
      setNotice({ kind: 'missing', fields });
      (fields[0] === 'mainLanguage' ? mainRef : levelRef).current?.focus();
      return;
    }
    setSaving(true);
    setNotice(null);
    const result: LearnActionResult<LearnSetupRead | null> = await saveLearnSetupAction(input).catch(() => ({
      ok: false as const,
      error: 'FAILED' as const,
    }));
    if (!result.ok || !result.data) {
      setSaving(false);
      setNotice({ kind: 'error', error: result.ok ? 'FAILED' : result.error });
      return;
    }
    saved.current = true;
    if (destination.href) {
      // The page stays as it is, its button busy, until the next one is up.
      router.push(destination.href);
      return;
    }
    const after = result.data;
    setForm(() => setupFormAfter(pendingSetupForm(), after, null));
    setSaving(false);
    setNotice({ kind: 'saved' });
    saved.current = false;
  }, [form, destination.href, router]);

  const pending = form.source === 'pending';
  useEnter(page === 'form' && !pending && !saving ? () => void save() : null);

  const signInHere = useCallback(() => {
    signIn(IDENTITY_PROVIDER, { redirectTo: LEARN_SETUP_PATH }).catch(() => {});
  }, []);

  if (page === 'visitor' || page === 'ended') {
    return <SetupVisitor ended={page === 'ended'} titleRef={titleRef} onSignIn={signInHere} />;
  }
  if (page === 'failed') {
    return (
      <SetupFailed
        titleRef={titleRef}
        onReload={() => {
          setForm(pendingSetupForm());
          setPage('form');
          setAttempt((count) => count + 1);
        }}
      />
    );
  }
  return (
    <SetupView
      form={form}
      destination={destination}
      hints={hints}
      saving={saving}
      notice={notice}
      onPick={pick}
      onSave={() => void save()}
      onSignIn={signInHere}
      mainRef={mainRef}
      levelRef={levelRef}
      titleRef={formTitleRef}
    />
  );
}
