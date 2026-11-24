'use client';

import { cn } from '@/lib/utils';
import type { ContributeLanguage, ContributePreferences } from '@/lib/workspace/contribute.types';
import { LANGUAGES } from '@/lib/workspace/format';

/**
 * What Settings saves: the languages alone. Kinds of issue and a largest size are no choice; one saved earlier stays
 * as it is, since a save that leaves a field out keeps it.
 */
export type PreferencesDraft = Pick<ContributePreferences, 'languages'>;

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** The languages matching takes from the user. None picked filters nothing. */
export function PreferencesFields({
  value,
  onChange,
}: {
  value: PreferencesDraft;
  onChange: (next: PreferencesDraft) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        {/* The dialog's title says Languages: the legend is for screen readers. */}
        <legend className="sr-only">Languages</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LANGUAGES) as ContributeLanguage[]).map((language) => {
            const on = value.languages.includes(language);
            return (
              <button
                key={language}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...value, languages: toggle(value.languages, language) })}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm',
                  on
                    ? 'border-primary bg-brand-soft text-brand-soft-foreground'
                    : 'border-dashed text-muted-foreground hover:text-foreground',
                )}
              >
                {LANGUAGES[language]}
                {on ? ' ×' : ''}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">None picked: every language the pool has.</span>
      </fieldset>
    </div>
  );
}
