'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { OnboardingHow, OnboardingLanguages } from './setup-onboarding';
import { SetupFailed, type SetupNotice, SetupView, SetupVisitor } from './setup-parts';
import { useEnter, useFocusOnShow } from '@/components/learn/player/use-page-keys';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { keptAnswerFor, readKeptAnswer } from '@/lib/learn/kept-answer';
import type { LearnActionResult } from '@/lib/learn/learn-action';
import { lessonSlugOfBack, onboardingLineOf, onboardingSaveOf, onboardingTicksOf } from '@/lib/learn/onboarding';
import { LEARN_HOME_PATH, LEARN_SETUP_MINE_PATH } from '@/lib/learn/paths';
import {
  type LearnSetupRead,
  missingOf,
  pendingSetupForm,
  type SetupForm,
  type SetupInput,
  type SetupLanguage,
  type SetupPick,
  setupFormAfter,
  setupFormPick,
  setupFormUnread,
  setupInputOfForm,
  setupReadOf,
} from '@/lib/learn/setup';
import { saveLearnSetupAction, startLearnSetupGuessAction } from '@/lib/learn/setup.actions';
import { readPicked } from '@/lib/learn/use-example-language';
import { hasSessionHint } from '@/lib/session-hint';
import { learnSetupHrefOf } from '@/lib/workspace/paths';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

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

/** What `/learn/setup` draws: the sign-in for a visitor; Learn's onboarding, or the editor of their setup. */
export type SetupMode = 'visitor' | 'onboarding' | 'editor';

/**
 * Learn's setup page in the browser. The page is the person's own: once it is up, a person with a session reads
 * their setup. A visitor (`visitor`, as the server found them) is asked to sign in from the first paint, back to the
 * same address; a session that ended on the way is asked again. With no setup yet our guess starts right
 * here (the page may be the person's very first Learn page), and the setup is read again every two seconds until the
 * guess is in. A choice the person made meanwhile is never undone by the guess.
 * - `onboarding`, for a person without the Learn sign: "How Learn works", then "Your languages", ticked from the
 *   setup as read. "Save and start" saves the setup with the Learn sign and goes to `back`, else Learn home. When the
 *   setup does not load here and the sign is not known (`sign`), the page says so instead: nothing is saved over a
 *   setup that may be there.
 * - `editor`: the setup's three fields and "Save", which changes the setup in place, gives no sign, and goes to `back`
 *   when the page has one (only when the sign could not be read).
 */
export function SetupLive({
  mode,
  back,
  sign = null,
}: {
  mode: SetupMode;
  back: Route | null;
  /** The Learn sign as the server read it: null when it could not be read. */
  sign?: boolean | null;
}) {
  const onboarding = mode === 'onboarding';
  const [page, setPage] = useState<Page>(mode === 'visitor' ? 'visitor' : 'form');
  const [form, setForm] = useState<SetupForm>(pendingSetupForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<SetupNotice | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The onboarding's step, and the languages the person ticked there (null until they tick one: the setup's then).
  const [step, setStep] = useState<1 | 2>(1);
  const [ticked, setTicked] = useState<SetupLanguage[] | null>(null);
  // A visitor's answer kept for the lesson the person goes back to, read once the page runs.
  const [answerKept, setAnswerKept] = useState(false);
  const router = useRouter();
  const hints = useKeyHints();
  const mainRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<HTMLInputElement>(null);
  const titleRef = useFocusOnShow<HTMLHeadingElement>(page !== 'form');
  // After "Try again" the button is gone: the form's title takes the focus, so the person's place is not lost.
  const formTitleRef = useFocusOnShow<HTMLHeadingElement>(page === 'form' && attempt > 0);
  const languagesTitleRef = useFocusOnShow<HTMLHeadingElement>(onboarding && step === 2);
  // Once saved, a read still on its way changes nothing.
  const saved = useRef(false);

  useEffect(() => {
    const slug = lessonSlugOfBack(back);
    setAnswerKept(slug !== null && keptAnswerFor(readKeptAnswer(), slug, Date.now()) !== null);
  }, [back]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again reads the setup once more.
  useEffect(() => {
    if (mode === 'visitor' || !hasSessionHint(document.cookie)) {
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
        // The editor's first read failing is the page's, and the onboarding's too while the sign is not known (a saved
        // setup may be there); with the sign known, the onboarding goes on with nothing ticked. A later read
        // only ends the wait for our guess.
        if (polls === 0 && (!onboarding || sign === null)) setPage('failed');
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

  const pick = useCallback((change: SetupPick) => {
    setNotice(null);
    setForm((current) => setupFormPick(current, change));
  }, []);

  const ticks = ticked ?? onboardingTicksOf(form.values);
  const tick = useCallback(
    (language: SetupLanguage) => {
      setNotice(null);
      setTicked((current) => {
        const from = current ?? ticks;
        return from.includes(language) ? from.filter((each) => each !== language) : [...from, language];
      });
    },
    [ticks],
  );

  /** Sends the save, then goes on: `back`, else Learn home from the onboarding; the editor stays without `back`. */
  const send = useCallback(
    async (input: SetupInput) => {
      setSaving(true);
      setNotice(null);
      const result: LearnActionResult<LearnSetupRead | null> = await saveLearnSetupAction(input, {
        onboarding,
      }).catch(() => ({ ok: false as const, error: 'FAILED' as const }));
      if (!result.ok || !result.data) {
        setSaving(false);
        setNotice({ kind: 'error', error: result.ok ? 'FAILED' : result.error });
        return;
      }
      saved.current = true;
      const next = back ?? (onboarding ? LEARN_HOME_PATH : null);
      if (next) {
        // The page stays as it is, its button busy, until the next one is up.
        router.push(next);
        return;
      }
      const after = result.data;
      setForm(() => setupFormAfter(pendingSetupForm(), after, null));
      setSaving(false);
      setNotice({ kind: 'saved' });
      saved.current = false;
    },
    [onboarding, back, router],
  );

  const save = useCallback(() => {
    if (onboarding) {
      const input = onboardingSaveOf(ticks, form.values);
      if (input) void send(input);
      return;
    }
    const input = setupInputOfForm(form);
    if (!input) {
      const fields = missingOf(form.values);
      setNotice({ kind: 'missing', fields });
      (fields[0] === 'mainLanguage' ? mainRef : levelRef).current?.focus();
      return;
    }
    void send(input);
  }, [onboarding, ticks, form, send]);

  const pending = form.source === 'pending';
  const howStep = onboarding && step === 1;
  const canSave = !pending && !saving && (!onboarding || ticks.length > 0);
  useEnter(page !== 'form' ? null : howStep ? () => setStep(2) : canSave ? save : null);

  const signInHere = useCallback(() => {
    signIn(IDENTITY_PROVIDER, { redirectTo: learnSetupHrefOf(back) }).catch(() => {});
  }, [back]);

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
  if (howStep) {
    return (
      <OnboardingHow
        line={onboardingLineOf(back, answerKept)}
        lineMayGrow={lessonSlugOfBack(back) !== null}
        hints={hints}
        onContinue={() => setStep(2)}
      />
    );
  }
  if (onboarding) {
    return (
      <OnboardingLanguages
        ticked={ticks}
        pending={pending}
        saving={saving}
        notice={notice}
        hints={hints}
        onTick={tick}
        onSave={save}
        onSignIn={signInHere}
        titleRef={languagesTitleRef}
      />
    );
  }
  return (
    <SetupView
      form={form}
      hints={hints}
      saving={saving}
      notice={notice}
      onPick={pick}
      onSave={save}
      onSignIn={signInHere}
      mainRef={mainRef}
      levelRef={levelRef}
      titleRef={formTitleRef}
    />
  );
}
