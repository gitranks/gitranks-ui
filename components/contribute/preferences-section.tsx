'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LanguagesDialog } from './languages-dialog';
import type { PreferencesDraft } from './preferences-fields';
import { Button } from '@/components/ui/button';
import { SettingsRow } from '@/components/workspace/settings-rows';
import { useHashOpen } from '@/components/workspace/use-hash-open';
import { preferencesSummaryOf } from '@/lib/contribute/work-summary';
import type { ContributePreferences } from '@/lib/workspace/contribute.types';

/**
 * The languages' row on the Settings work page: the languages in short, and Edit, which opens them in the languages
 * dialog. Opens by itself at `#work`, where links to them point.
 */
export function PreferencesSection({
  preferences,
  modes = false,
}: {
  preferences: ContributePreferences | null;
  /** What the user works on loaded: these are filters on top of the mode. */
  modes?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useHashOpen('work');
  // What was last saved here, until the page's read catches up with it.
  const [saved, setSaved] = useState<PreferencesDraft | null>(null);
  const title = 'Languages';

  return (
    <SettingsRow id="work" icon={SlidersHorizontal} title={title} value={preferencesSummaryOf(preferences)}>
      <LanguagesDialog
        open={open}
        onOpenChange={setOpen}
        start={(saved ?? preferences)?.languages ?? []}
        preferences={preferences}
        modes={modes}
        trigger={
          <Button type="button" variant="outline" size="sm" aria-label={`Edit ${title.toLowerCase()}`}>
            Edit
          </Button>
        }
        onSaved={(draft) => {
          setSaved(draft);
          router.refresh();
        }}
      />
    </SettingsRow>
  );
}
