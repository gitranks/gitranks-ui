'use client';

import { Check, EyeOff } from 'lucide-react';

import { ButtonGroup, ButtonGroupItem } from '@/components/button-group/button-group';
import type { Choice } from '@/lib/contribute/comment-actions';
import { cn } from '@/lib/utils';

/**
 * Address or Ignore a waiting review thread: one segmented switch, not two buttons. The raised half is the comment's
 * state, and a click only moves it. `error`: why the last choice could not be saved, under it.
 */
export function AddressSwitch({
  author,
  choice,
  onChoose,
  disabled,
  error,
}: {
  author: string | null;
  choice: Choice;
  onChoose: (choice: Choice) => void;
  disabled: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <fieldset className="flex-none" aria-label={`Address or ignore ${author ? `${author}'s` : 'this'} comment`}>
        <ButtonGroup className="h-9 max-sm:h-auto max-sm:w-full">
          {(['address', 'ignore'] as const).map((each) => (
            <ButtonGroupItem
              key={each}
              active={choice === each}
              disabled={disabled}
              onClick={() => onChoose(each)}
              className={cn(
                'min-w-24 px-3 max-sm:min-h-11',
                choice !== each && 'text-muted-foreground hover:text-foreground dark:hover:text-foreground',
              )}
            >
              {each === 'address' ? <Check aria-hidden /> : <EyeOff aria-hidden />}
              {each === 'address' ? 'Address' : 'Ignore'}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
      </fieldset>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
