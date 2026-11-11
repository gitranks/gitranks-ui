'use client';

import { CheckIcon } from 'lucide-react';
import { type FC, type ReactNode, useRef, useState } from 'react';

import { Flag } from '@/components/flag/flag';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type PickerOption = {
  value: string;
  label: string;
  flag?: string | null;
  /** Written before the label, quietly: a rank. */
  hint?: string;
};

type PickerPopoverProps = {
  /** The trigger button's content. */
  trigger: ReactNode;
  /** The trigger button's accessible name; it should start with the words the button shows. */
  label: string;
  triggerClassName?: string;
  groups: { heading?: string; options: PickerOption[] }[];
  placeholder: string;
  empty: string;
  selected?: string;
  onPick: (value: string) => void;
};

/** An outline button that opens a searchable list (shadcn Popover + Command). */
export const PickerPopover: FC<PickerPopoverProps> = ({
  trigger,
  label,
  triggerClassName,
  groups,
  placeholder,
  empty,
  selected,
  onPick,
}) => {
  const [open, setOpen] = useState(false);
  // After a pick, focus stays where the pick takes it instead of going back to the button (and scrolling to it).
  const picked = useRef(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={cn('max-sm:min-h-11', triggerClassName)}
        >
          {trigger}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="end"
        onCloseAutoFocus={(event) => {
          if (picked.current) {
            event.preventDefault();
            picked.current = false;
          }
        }}
      >
        {/* Search the names only, not the values that keep items apart. */}
        <Command
          filter={(_, search, keywords) =>
            keywords?.join(' ').toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0
          }
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            {groups.map((group, groupIndex) =>
              group.options.length ? (
                <CommandGroup key={group.heading ?? 'all'} heading={group.heading}>
                  {group.options.map((option) => (
                    <CommandItem
                      key={`${group.heading ?? ''}:${option.value}`}
                      // Unique across groups: the viewer's own country can be listed twice.
                      value={`${groupIndex}~${option.label}`}
                      keywords={[option.label]}
                      onSelect={() => {
                        picked.current = true;
                        setOpen(false);
                        onPick(option.value);
                      }}
                    >
                      {option.hint && (
                        <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {option.hint}
                        </span>
                      )}
                      <Flag flag={option.flag} />
                      <span className="truncate">{option.label}</span>
                      {option.value === selected && <CheckIcon className="ml-auto" aria-label="Selected" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null,
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
