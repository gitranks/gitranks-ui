'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { savePreferences } from '../actions';
import { type PreferencesDraft, PreferencesFields } from './preferences-fields';
import { Panel, PanelTitle } from './primitives';
import { Button } from '@/components/ui/button';
import type { ContributePreferences } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { cn } from '@/lib/utils';

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`;

/** What the user works on. Topics and repositories come from their profile and are counted here. */
export function PreferencesSection({ preferences }: { preferences: ContributePreferences | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PreferencesDraft>({
    languages: preferences?.languages ?? [],
    kinds: preferences?.kinds ?? [],
    maxSize: preferences?.maxSize ?? null,
  });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await savePreferences(draft);
      setStatus(
        result.ok
          ? { ok: true, text: 'Saved.' }
          : { ok: false, text: contributeErrorMessage(result.error, result.message) },
      );
      if (result.ok) router.refresh();
    });

  const topics = preferences?.topicIds.length ?? 0;
  const skipped = preferences?.reposOut.length ?? 0;
  const only = preferences?.reposIn.length ?? 0;

  return (
    <Panel id="work">
      <PanelTitle title="What you work on" text="Filled from your profile. Add or remove anything." />
      <PreferencesFields value={draft} onChange={setDraft} />
      <p className="text-sm text-muted-foreground">
        {topics ? `${plural(topics, 'topic')} from your profile` : 'Topics from your profile'}
        {only ? ` · only ${plural(only, 'repo')}` : ''}
        {skipped ? ` · ${plural(skipped, 'repo')} skipped` : ''}. Picking topics and repos here is coming soon.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={save}
          disabled={pending}
          className="px-4 font-semibold"
        >
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {status ? (
          <span
            role={status.ok ? 'status' : 'alert'}
            className={cn('text-sm', status.ok ? 'text-positive' : 'text-destructive')}
          >
            {status.text}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
