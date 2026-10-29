'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { savePreferences } from '../actions';
import { type PreferencesDraft, PreferencesFields } from './preferences-fields';
import { Eyebrow } from './primitives';
import type { ContributePreferences } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';

/** Step 4: what the user likes to work on, prefilled from their profile, then the first feed. */
export function PreferencesStep({ preferences }: { preferences: ContributePreferences | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PreferencesDraft>({
    languages: preferences?.languages ?? [],
    kinds: preferences?.kinds ?? [],
    maxSize: preferences?.maxSize ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await savePreferences(draft);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      router.push('/contribute/issues');
    });

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6">
      <Eyebrow>Step 4 · What you like to work on</Eyebrow>
      <span className="text-[17px] font-semibold">Filled from your profile. Add or remove anything.</span>
      <PreferencesFields value={draft} onChange={setDraft} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Show my issues'}
        </button>
        {error ? (
          <span role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
