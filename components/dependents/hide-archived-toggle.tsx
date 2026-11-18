'use client';

import { type FC, useId } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type HideArchivedToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** Leaves archived repositories out of a dependents list; shown only when the list has one. */
export const HideArchivedToggle: FC<HideArchivedToggleProps> = ({ checked, onChange, disabled, className }) => {
  const id = useId();

  return (
    <label htmlFor={id} className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onChange(value === true)} />
      Hide archived
    </label>
  );
};
