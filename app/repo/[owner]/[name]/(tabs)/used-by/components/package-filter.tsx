'use client';

import { ChevronDown } from 'lucide-react';
import type { FC } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** The value of "All packages". */
const ALL = '';

/** One package the filter lists: its value (`<registry>/<name>`), its name, and its registry when there are several. */
export type PackageFilterOption = { value: string; name: string; registryLabel?: string };

type PackageFilterProps = {
  /** The repository's packages, as the filter lists them. */
  options: readonly PackageFilterOption[];
  /** How many it publishes: more than the options when the API lists only the top ones. */
  total: number;
  /** The value of the package the list is cut to; `null` for all of them. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Chips for two or three packages, a menu for more. */
  variant: 'chips' | 'dropdown';
  disabled?: boolean;
};

/** Cuts a repository's dependents to the ones that use one of its packages. */
export const PackageFilter: FC<PackageFilterProps> = ({ options, total, value, onChange, variant, disabled }) => {
  const registryOf = (option: PackageFilterOption) =>
    option.registryLabel && <span className="ml-1 font-sans font-normal opacity-70">{option.registryLabel}</span>;
  const selected = options.find((option) => option.value === value);
  if (variant === 'chips') {
    const chip = (label: string, chipValue: string | null, option?: PackageFilterOption) => {
      const on = value === chipValue;
      return (
        <button
          key={chipValue ?? ALL}
          type="button"
          aria-pressed={on}
          disabled={disabled}
          onClick={() => onChange(chipValue)}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-0.5 font-mono text-xs font-medium whitespace-nowrap transition-colors',
            on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
            chipValue === null && 'font-sans',
          )}
        >
          {label}
          {option && registryOf(option)}
        </button>
      );
    };
    return (
      <fieldset className="flex min-w-0 flex-wrap items-center gap-2">
        <legend className="sr-only">Packages</legend>
        {chip('All packages', null)}
        {options.map((option) => chip(option.name, option.value, option))}
      </fieldset>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button type="button" variant="outline" size="sm" className="max-w-full">
          <span className={cn('truncate', value !== null && 'font-mono')}>
            {selected?.name ?? `All ${total.toLocaleString('en-US')} packages`}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuRadioGroup value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
          <DropdownMenuRadioItem value={ALL}>All {total.toLocaleString('en-US')} packages</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="font-mono">
              {option.name}
              {registryOf(option)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
