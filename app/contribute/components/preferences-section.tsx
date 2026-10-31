'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { savePreferences } from '../actions';
import { type PreferencesDraft, PreferencesFields } from './preferences-fields';
import { SettingsRow } from './settings-rows';
import { useHashOpen } from './use-hash-open';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ContributePreferences } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { plural } from '@/lib/contribute/set-format';
import { preferencesSummaryOf } from '@/lib/contribute/settings-summary';

const draftOf = (preferences: ContributePreferences | null): PreferencesDraft => ({
  languages: preferences?.languages ?? [],
  kinds: preferences?.kinds ?? [],
  maxSize: preferences?.maxSize ?? null,
});

/** Languages, kinds and size, with the topics counted, and why they apply. */
export function PreferencesForm({
  preferences,
  modes,
  draft,
  onChange,
}: {
  preferences: ContributePreferences | null;
  modes: boolean;
  draft: PreferencesDraft;
  onChange: (draft: PreferencesDraft) => void;
}) {
  const topics = preferences?.topicIds.length ?? 0;
  return (
    <>
      <PreferencesFields
        value={draft}
        onChange={onChange}
        languagesNote={modes ? 'Applies in every mode.' : undefined}
      />
      <p className="text-sm text-muted-foreground">
        {topics ? `${plural(topics, 'topic')} from your profile` : 'Topics from your profile'}
        {modes ? '. Picking topics here is coming soon.' : '. Picking topics and repos here is coming soon.'}
      </p>
    </>
  );
}

/**
 * The preferences' row on the Settings summary: languages, kinds and size in short, and Edit, which opens them in a
 * dialog saved with one button. Opens by itself at `#work`, where links to them point.
 */
export function PreferencesSection({
  preferences,
  modes = false,
}: {
  preferences: ContributePreferences | null;
  /** The modes are shown: these are filters on top of them. */
  modes?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useHashOpen('work');
  const [draft, setDraft] = useState<PreferencesDraft>(() => draftOf(preferences));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const title = modes ? 'Filters' : 'What you work on';

  const change = (next: boolean) => {
    if (pending) return;
    // Opened again: from what is saved, not from a draft left behind.
    if (next) {
      setDraft(draftOf(preferences));
      setError(null);
    }
    setOpen(next);
  };

  const save = () =>
    startTransition(async () => {
      const result = await savePreferences(draft);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setOpen(false);
      router.refresh();
    });

  return (
    <SettingsRow id="work" icon={SlidersHorizontal} title={title} value={preferencesSummaryOf(preferences)}>
      <Dialog open={open} onOpenChange={change}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" aria-label={`Edit ${title.toLowerCase()}`}>
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {modes
                ? 'Filters on top of where your issues come from, in every mode. Filled from your profile.'
                : 'Filled from your profile. Add or remove anything.'}
            </DialogDescription>
          </DialogHeader>
          <PreferencesForm preferences={preferences} modes={modes} draft={draft} onChange={setDraft} />
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => change(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsRow>
  );
}
