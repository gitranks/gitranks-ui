import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

/**
 * A top-level item of the main menu: a pill in the header row from `sm` up, a full-width row of the menu's panel
 * below it. One row, whatever it holds (the base link stacks its children).
 */
export const mainMenuItemClass = cn(
  navigationMenuTriggerStyle(),
  'flex-row bg-transparent max-sm:h-10 max-sm:w-full max-sm:justify-between max-sm:px-3',
);

/** The same item for a menu that turns into its panel below `lg` (`PhoneMenu breakpoint="lg"`). */
export const wideMenuItemClass = cn(
  navigationMenuTriggerStyle(),
  'flex-row bg-transparent max-lg:h-10 max-lg:w-full max-lg:justify-between max-lg:px-3',
);
