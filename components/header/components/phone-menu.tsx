'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';

import { NavigationMenu, NavigationMenuList } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

type PhoneMenuProps = Omit<ComponentProps<typeof NavigationMenu>, 'ref' | 'value' | 'onValueChange' | 'viewport'> & {
  /** The menu's items (`NavigationMenuItem`s), styled with `mainMenuItemClass`. */
  children: ReactNode;
};

/**
 * A header menu: its items in the row from `sm` up, a panel under a menu button below it. One markup, laid out by the
 * breakpoint's classes. The panel closes on a tap outside it, on Escape (focus goes back to the button), on a tap on
 * any of its links and on back or forward.
 */
export function PhoneMenu({ className, children, ...props }: PhoneMenuProps) {
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
      // Radix wraps the list in a `position: relative` div; below `sm` the panel is placed against the root instead.
      className={cn('max-sm:[&>div]:static!', className)}
      viewport={false}
      {...props}
    >
      <button
        ref={toggle}
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md hover:bg-accent sm:hidden"
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
        className={cn(
          'max-sm:absolute max-sm:top-full max-sm:right-0 max-sm:z-50 max-sm:mt-2 max-sm:w-64 max-sm:flex-col max-sm:items-stretch max-sm:gap-0.5 max-sm:rounded-lg max-sm:border max-sm:bg-popover max-sm:p-1.5 max-sm:text-popover-foreground max-sm:shadow-md',
          !open && 'max-sm:hidden',
        )}
      >
        {children}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
