'use client';

import { SearchIcon } from 'lucide-react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { type FC, type ReactNode, useEffect, useState } from 'react';

import { countriesPagePath, countryAnchor } from '../country-paths';
import { Flag } from '@/components/flag/flag';
import { Link } from '@/components/link/link';
import { PickerPopover } from '@/components/summary-ranking/picker-popover';
import { useViewerCountry } from '@/components/summary-ranking/use-viewer-country';
import { formatNumberShort } from '@/utils/format-number-short';

/** One country, on any page of the ranking. */
export type CountryToolEntry = {
  name: string;
  flag: string | null;
  rank: number;
  /** Its place in the list, which gives its page. */
  position: number;
  previous: number | null;
  value: number;
  usersCount: number;
};

type CountryRankingToolsProps = {
  /** The order as the URL writes it: `stars`. */
  order: string;
  pageSize: number;
  entries: CountryToolEntry[];
  /** What the value counts: "stars". */
  unit: string;
  /** "by stars". */
  rankedBy: string;
  /** Where the viewer's country's developers are ranked. */
  rankingType: string;
  tabs: ReactNode;
};

const pageOf = (rank: number, pageSize: number) => Math.ceil(rank / pageSize);

const moveText = ({ rank, previous }: CountryToolEntry) => {
  if (!previous) return null;
  if (previous === rank) return 'same as last month';
  return previous > rank ? `up ${previous - rank} since last month` : `down ${rank - previous} since last month`;
};

/** The ranking's tabs and "Find a country", then the signed-in viewer's own country. */
export const CountryRankingTools: FC<CountryRankingToolsProps> = ({
  order,
  pageSize,
  entries,
  unit,
  rankedBy,
  rankingType,
  tabs,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const viewerCountry = useViewerCountry();
  const [picked, setPicked] = useState<string | null>(null);

  // A link to a row (`#country-ukraine`) marks it, after a picked country's page opens too.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read the hash when the page changes
  useEffect(() => {
    const read = () => setPicked(window.location.hash.slice(1) || null);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [pathname]);

  const onPick = (name: string) => {
    const entry = entries.find((e) => e.name === name);
    if (!entry) return;
    const anchor = countryAnchor(entry.name);
    const path = countriesPagePath(order, pageOf(entry.position, pageSize));
    setPicked(anchor);
    if (path === pathname) {
      window.history.replaceState(null, '', `#${anchor}`);
      document.getElementById(anchor)?.scrollIntoView({ block: 'center' });
    } else {
      router.push(`${path}#${anchor}` as Route);
    }
  };

  const mine = viewerCountry ? entries.find((e) => e.name === viewerCountry) : undefined;
  const marks = [
    picked && /^country-[a-z0-9-]+$/.test(picked) ? `#${picked}{background-color:var(--muted)}` : '',
    mine ? `#${countryAnchor(mine.name)}{background-color:var(--brand-soft)}` : '',
  ].join('');

  return (
    <>
      {marks && <style>{marks}</style>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tabs}
        <PickerPopover
          label="Find a country"
          trigger={
            <>
              <SearchIcon className="text-muted-foreground" />
              <span className="font-normal text-muted-foreground">Find a country</span>
            </>
          }
          triggerClassName="w-full justify-start sm:w-64"
          placeholder="Country name"
          empty="No country by that name."
          groups={[
            {
              options: entries.map((e) => ({ value: e.name, label: e.name, flag: e.flag, hint: `#${e.rank}` })),
            },
          ]}
          onPick={onPick}
        />
      </div>
      {mine && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl border bg-brand-soft px-4 py-3 text-sm text-brand-soft-foreground">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs font-medium uppercase tracking-wide">Your country</span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Flag flag={mine.flag} />
              {mine.name}
            </span>
            <Link
              href={`${countriesPagePath(order, pageOf(mine.position, pageSize))}#${countryAnchor(mine.name)}`}
              className="font-mono font-semibold tabular-nums text-inherit"
            >
              #{mine.rank}
            </Link>
            <span>
              {rankedBy}
              {moveText(mine) ? `, ${moveText(mine)}` : ''}
            </span>
            <span className="font-mono tabular-nums">
              {formatNumberShort(mine.value)} {unit}
              {unit !== 'developers' && ` · ${formatNumberShort(mine.usersCount)} developers`}
            </span>
          </p>
          <Link
            href={`/country/${encodeURIComponent(mine.name)}/${rankingType}/1`}
            className="font-medium text-inherit"
          >
            {mine.name}&apos;s developers
          </Link>
        </div>
      )}
    </>
  );
};
