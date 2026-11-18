import type { ComponentProps, ReactNode } from 'react';

import type { AdminIntent } from '../admin-state';
import { Button } from '@/components/ui/button';

/** The board's server action, as `useActionState` hands it out; absent where a board is only drawn. */
export type PressAction = (form: FormData) => void;

/**
 * One button that POSTs one press: a form of its own, the press's name and ids in hidden fields. Opening the page
 * changes nothing; only a press does.
 */
export function PressButton({
  action,
  intent,
  fields,
  pending,
  disabled,
  variant = 'outline',
  size = 'sm',
  children,
}: Readonly<{
  action?: PressAction;
  intent: AdminIntent;
  fields: Record<string, string>;
  pending?: boolean;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  children: ReactNode;
}>) {
  return (
    <form action={action}>
      <input type="hidden" name="intent" value={intent} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={disabled || pending}>
        {children}
      </Button>
    </form>
  );
}
