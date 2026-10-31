'use client';

import { useId } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  ContributeIssueKind,
  ContributeIssueSize,
  ContributeLanguage,
  ContributePreferences,
} from '@/lib/contribute/contribute.types';
import { KINDS, LANGUAGES, SIZES } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

export type PreferencesDraft = Pick<ContributePreferences, 'languages' | 'kinds' | 'maxSize'>;

/** The "Any size" item: Radix takes no empty value, so no largest size is this, and back to `null` on change. */
export const ANY_SIZE = 'any';

/** The largest size's item label, "Any size" for none. */
export const sizeLabelOf = (size: ContributeIssueSize | null) =>
  size ? `Up to ${SIZES[size].toLowerCase()}` : 'Any size';

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Languages, issue kinds and the largest size: what matching takes from the user. An empty list filters nothing. */
export function PreferencesFields({
  value,
  onChange,
  languagesNote,
}: {
  value: PreferencesDraft;
  onChange: (next: PreferencesDraft) => void;
  /** Said after the languages' hint. */
  languagesNote?: string;
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
        <span className="text-xs text-muted-foreground">
          None picked: every language the pool has.{languagesNote ? ` ${languagesNote}` : ''}
        </span>
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
        <Select
          value={value.maxSize ?? ANY_SIZE}
          onValueChange={(next) =>
            onChange({ ...value, maxSize: next === ANY_SIZE ? null : (next as ContributeIssueSize) })
          }
        >
          <SelectTrigger id={`${id}-size`} className="min-h-11 w-full max-w-56 rounded-lg text-base">
            <SelectValue>{sizeLabelOf(value.maxSize)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_SIZE}>{sizeLabelOf(null)}</SelectItem>
            {(Object.keys(SIZES) as ContributeIssueSize[]).map((size) => (
              <SelectItem key={size} value={size}>
                {sizeLabelOf(size)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Size is known only for some issues; ones without a size still show.
        </span>
      </div>
    </div>
  );
}
