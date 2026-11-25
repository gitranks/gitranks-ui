'use client';

import { type ReactNode, useState, useTransition } from 'react';

import { type PreferencesDraft, PreferencesFields } from './preferences-fields';
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
import { savePreferences } from '@/lib/contribute/actions';
import type { ContributeLanguage, ContributePreferences } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { plural } from '@/lib/workspace/format';

/** The dialog's words: one dialog, in Settings and on the flow's first issue. */
export const LANGUAGES_DIALOG = {
  title: 'Languages',
  text: 'Filled from your profile. Add or remove anything.',
  modesText: 'Issues are matched to these in every mode. Filled from your profile.',
} as const;

/** The languages, with the topics counted, and why they apply. */
function PreferencesForm({
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
      <PreferencesFields value={draft} onChange={onChange} />
      <p className="text-sm text-muted-foreground">
        {topics ? `${plural(topics, 'topic')} from your profile` : 'Topics from your profile'}
        {modes ? '. Picking topics here is coming soon.' : '. Picking topics and repos here is coming soon.'}
      </p>
    </>
  );
}

/**
 * The languages issues are picked for, in a dialog saved with one button: Settings' languages row and the flow's
 * "Change" draw this one. It opens with `start` ticked (the saved languages, else what the page says it picked for);
 * Cancel, Escape and a press outside close it without saving; a failed save keeps it open with the error. `onSaved` hears
 * the saved languages once the dialog has closed.
 */
export function LanguagesDialog({
  open,
  onOpenChange,
  start,
  preferences,
  modes = false,
  trigger,
  beforeSave,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: readonly ContributeLanguage[];
  preferences: ContributePreferences | null;
  /** What the user works on loaded: these are filters on top of the mode. */
  modes?: boolean;
  /** The button that opens it, when it has one of its own. */
  trigger?: ReactNode;
  /** Runs just before the save is sent (the flow reads the list's time then). */
  beforeSave?: () => Promise<void>;
  onSaved: (saved: PreferencesDraft) => void;
}) {
  const [draft, setDraft] = useState<PreferencesDraft>(() => ({ languages: [...start] }));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Each time it opens, by its own trigger or by the page ("Add a language"): from what it starts with now, not from
  // a draft left behind.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft({ languages: [...start] });
      setError(null);
    }
  }

  const change = (next: boolean) => {
    if (pending) return;
    onOpenChange(next);
  };

  const save = () =>
    startTransition(async () => {
      await beforeSave?.();
      const result = await savePreferences(draft);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      onOpenChange(false);
      onSaved(draft);
    });

  return (
    <Dialog open={open} onOpenChange={change}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{LANGUAGES_DIALOG.title}</DialogTitle>
          <DialogDescription>{modes ? LANGUAGES_DIALOG.modesText : LANGUAGES_DIALOG.text}</DialogDescription>
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
  );
}
