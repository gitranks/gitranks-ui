import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

/**
 * A top-level item of the main menu: a pill in the header row from `sm` up, a full-width row of the menu's panel
 * below it. One row, whatever it holds (the base link stacks its children). The item of the page's section carries
 * `data-active` (Radix sets it empty, so the base link's `data-[active=true]` never matches).
 */
export const mainMenuItemClass = cn(
  navigationMenuTriggerStyle(),
  'flex-row bg-transparent max-sm:h-10 max-sm:w-full max-sm:justify-between max-sm:px-3',
  'data-active:bg-accent data-active:text-accent-foreground',
);
