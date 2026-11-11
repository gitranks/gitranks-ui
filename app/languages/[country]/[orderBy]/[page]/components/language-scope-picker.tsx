'use client';

import { ChevronsUpDownIcon } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';

import { Flag } from '@/components/flag/flag';
import { PickerPopover } from '@/components/summary-ranking/picker-popover';
import { useViewerCountry } from '@/components/summary-ranking/use-viewer-country';

const WORLDWIDE = { value: 'global', label: 'Worldwide', flag: '🌍' };

type LanguageScopePickerProps = {
  /** `global` or a country's name. */
  scope: string;
  /** The order as the URL writes it: `score`. */
  order: string;
  countries: { name: string; flag: string | null }[];
};

/** Whose languages: worldwide or one country's, searchable, with the viewer's own country first. */
export const LanguageScopePicker: FC<LanguageScopePickerProps> = ({ scope, order, countries }) => {
  const router = useRouter();
  const viewerCountry = useViewerCountry();
  const mine = viewerCountry ? countries.find((c) => c.name === viewerCountry) : undefined;
  const current = scope === WORLDWIDE.value ? WORLDWIDE : countries.find((c) => c.name === scope);
  const toOption = (c: { name: string; flag: string | null }) => ({ value: c.name, label: c.name, flag: c.flag });

  return (
    <div className="flex w-full items-center gap-3 sm:w-auto">
      <span className="shrink-0 text-sm text-muted-foreground">Developers in</span>
      <PickerPopover
        label="Choose whose languages to rank"
        trigger={
          <>
            <Flag flag={current?.flag} />
            <span className="truncate">{current ? ('label' in current ? current.label : current.name) : scope}</span>
            <ChevronsUpDownIcon className="ml-auto opacity-50" />
          </>
        }
        triggerClassName="min-w-0 flex-1 justify-start sm:w-56 sm:flex-none"
        placeholder="Country name"
        empty="No country by that name."
        selected={scope}
        groups={[
          { options: [WORLDWIDE] },
          ...(mine ? [{ heading: 'Your country', options: [toOption(mine)] }] : []),
          { heading: 'Countries', options: countries.map(toOption) },
        ]}
        onPick={(value) => router.push(`/languages/${encodeURIComponent(value)}/${order}/1` as Route)}
      />
    </div>
  );
};
