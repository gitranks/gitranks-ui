'use client';

import { useId } from 'react';

import type {
  ContributeIssueKind,
  ContributeIssueSize,
  ContributeLanguage,
  ContributePreferences,
} from '@/lib/contribute/contribute.types';
import { KINDS, LANGUAGES, SIZES } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

export type PreferencesDraft = Pick<ContributePreferences, 'languages' | 'kinds' | 'maxSize'>;

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Languages, issue kinds and the largest size: what matching takes from the user. An empty list filters nothing. */
export function PreferencesFields({
  value,
  onChange,
}: {
  value: PreferencesDraft;
  onChange: (next: PreferencesDraft) => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Languages</legend>
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Issue kinds</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5">
          {(Object.keys(KINDS) as ContributeIssueKind[]).map((kind) => (
            <label key={kind} htmlFor={`${id}-kind-${kind}`} className="flex items-center gap-2 text-sm">
              <input
                id={`${id}-kind-${kind}`}
                type="checkbox"
                checked={value.kinds.includes(kind)}
                onChange={() => onChange({ ...value, kinds: toggle(value.kinds, kind) })}
                className="accent-primary"
              />
              {KINDS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-size`} className="text-sm font-medium">
          Largest issue size
        </label>
        <select
          id={`${id}-size`}
          value={value.maxSize ?? ''}
          onChange={(event) =>
            onChange({ ...value, maxSize: (event.target.value || null) as ContributeIssueSize | null })
          }
          className="max-w-56 rounded-lg border border-input bg-background px-3 py-2.5"
        >
          <option value="">Any size</option>
          {(Object.keys(SIZES) as ContributeIssueSize[]).map((size) => (
            <option key={size} value={size}>
              Up to {SIZES[size].toLowerCase()}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Size is known only for some issues; ones without a size still show.
        </span>
      </div>
    </div>
  );
}
