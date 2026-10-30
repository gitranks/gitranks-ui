'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';

import { NavigationMenu, NavigationMenuList } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

/** Below which width the items are a panel under a menu button: `sm` for the site's menu, `lg` for a longer one. */
export type PhoneMenuBreakpoint = 'sm' | 'lg';

// Whole class names per breakpoint, so Tailwind finds them.
const LAYOUT = {
  sm: {
    root: 'max-sm:[&>div]:static!',
    toggle: 'sm:hidden',
    panel:
      'max-sm:absolute max-sm:top-full max-sm:right-0 max-sm:z-50 max-sm:mt-2 max-sm:w-64 max-sm:flex-col max-sm:items-stretch max-sm:gap-0.5 max-sm:rounded-lg max-sm:border max-sm:bg-popover max-sm:p-1.5 max-sm:text-popover-foreground max-sm:shadow-md',
    closed: 'max-sm:hidden',
  },
  lg: {
    root: 'max-lg:[&>div]:static!',
    toggle: 'lg:hidden',
    panel:
      'max-lg:absolute max-lg:top-full max-lg:right-0 max-lg:z-50 max-lg:mt-2 max-lg:w-64 max-lg:flex-col max-lg:items-stretch max-lg:gap-0.5 max-lg:rounded-lg max-lg:border max-lg:bg-popover max-lg:p-1.5 max-lg:text-popover-foreground max-lg:shadow-md',
    closed: 'max-lg:hidden',
  },
} as const satisfies Record<PhoneMenuBreakpoint, Record<string, string>>;

type PhoneMenuProps = Omit<ComponentProps<typeof NavigationMenu>, 'ref' | 'value' | 'onValueChange' | 'viewport'> & {
  /** The menu's items (`NavigationMenuItem`s), styled with `menuItemClassOf(breakpoint)`. */
  children: ReactNode;
  breakpoint?: PhoneMenuBreakpoint;
};

/**
 * A header menu: its items in the row from the breakpoint up, a panel under a menu button below it. One markup, laid out by the
 * breakpoint's classes. The panel closes on a tap outside it, on Escape (focus goes back to the button), on a tap on
 * any of its links and on back or forward.
 */
export function PhoneMenu({ className, children, breakpoint = 'sm', ...props }: PhoneMenuProps) {
  const layout = LAYOUT[breakpoint];
  const [open, setOpen] = useState(false);
  // The open submenu, held here so a closed panel opens again with its submenus folded.
  const [submenu, setSubmenu] = useState('');
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setSubmenu('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Radix closes an open submenu first and marks the event handled; the next Escape closes the panel.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      close();
      toggle.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Back and forward fire no tap.
    window.addEventListener('popstate', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', close);
    };
  }, [open, close]);

  return (
    <NavigationMenu
      ref={root}
      value={submenu}
      onValueChange={setSubmenu}
      // Radix wraps the list in a `position: relative` div; below the breakpoint the panel is placed against the root.
      className={cn(layout.root, className)}
      viewport={false}
      {...props}
    >
      <button
        ref={toggle}
        type="button"
        className={cn('inline-flex size-10 items-center justify-center rounded-md hover:bg-accent', layout.toggle)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>
      <NavigationMenuList
        id={listId}
        // A tap on any link closes the panel, the current page's included (a tap outside it closes it too). Not the
        // pathname: reading it in the header makes every page that has one dynamic at prerender.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) close();
        }}
        className={cn(layout.panel, !open && layout.closed)}
      >
        {children}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
