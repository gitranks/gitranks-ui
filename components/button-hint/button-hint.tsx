'use client';

import { cloneElement, type ReactElement, type ReactNode, useId } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ButtonHintProps = {
  /** One sentence about the button's state ("Daily updates on. Next update in 5 h."); nothing when there is none. */
  hint?: ReactNode;
  /** The button. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
};

/**
 * A left-column button's note: a tooltip on hover, and the button's description for screen readers. Touch screens get
 * no tooltip; the dialog the button opens says the same. It replaces the grey line that sat under the button.
 */
export function ButtonHint({ hint, children }: Readonly<ButtonHintProps>) {
  const id = useId();
  if (!hint) {
    return children;
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{cloneElement(children, { 'aria-describedby': id })}</TooltipTrigger>
        <TooltipContent className="max-w-64 text-balance">{hint}</TooltipContent>
      </Tooltip>
      <span id={id} className="sr-only">
        {hint}
      </span>
    </>
  );
}
