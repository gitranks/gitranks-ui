'use client';

import { cloneElement, type ReactElement, type ReactNode, useId, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ButtonHintProps = {
  /** One sentence about the button's state ("Daily updates on. Next update in 5 h."); nothing when there is none. */
  hint?: ReactNode;
  /**
   * The button acts on the first press, with no dialog to explain it ("Update daily" spends a pick): screens without
   * hover show the hint as a line under it, since they get no tooltip.
   */
  actsAtOnce?: boolean;
  /** The button. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
};

/**
 * A left-column button's note, in place of the grey line that sat under it: a tooltip while the mouse is on the button,
 * and its description for screen readers. A screen without hover gets no tooltip, because the dialog the button opens
 * says the same; one that acts at once shows the line there instead. The tooltip opens on the mouse only: focus
 * coming back from a closed dialog must not open it. The button stays the same element with or without a hint, so
 * focus survives a label change.
 */
export function ButtonHint({ hint, actsAtOnce = false, children }: Readonly<ButtonHintProps>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const onMouse = (next: boolean) => (event: { pointerType: string }) => {
    if (event.pointerType === 'mouse') {
      setOpen(next);
    }
  };

  return (
    <>
      <Tooltip open={!!hint && open} onOpenChange={(next) => !next && setOpen(false)}>
        <TooltipTrigger asChild onPointerEnter={onMouse(true)} onPointerLeave={onMouse(false)}>
          {cloneElement(children, { 'aria-describedby': hint ? id : undefined })}
        </TooltipTrigger>
        {!!hint && <TooltipContent className="max-w-64 text-balance">{hint}</TooltipContent>}
      </Tooltip>
      {!!hint && (
        <span
          id={id}
          className={
            actsAtOnce
              ? 'mt-2 text-xs text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:sr-only'
              : 'sr-only'
          }
        >
          {hint}
        </span>
      )}
    </>
  );
}
