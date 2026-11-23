'use client';

import { type RefObject, useEffect, useRef } from 'react';

import { coursePageKeyOf } from '@/lib/learn/course';

/** Where a key was pressed: in a field, on a button or a link, or on the page itself. */
function whereOf(target: EventTarget | null): 'field' | 'control' | 'page' {
  const element = target as HTMLElement | null;
  if (!element || typeof element.closest !== 'function') return 'page';
  if (element.isContentEditable || element.closest('input, textarea, select')) return 'field';
  return element.closest('button, a, summary, [role="menuitem"], [role="menuitemradio"]') ? 'control' : 'page';
}

/**
 * The keys of a course's page and of all courses: "/" goes to the search, Esc clears it, Enter presses the highlighted
 * box's button and R its review link, when the page has them. A key with Ctrl, Alt or Cmd is the browser's.
 */
export function useCoursePageKeys({
  inputRef,
  onClear,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onClear: () => void;
}) {
  const clear = useRef(onClear);
  clear.current = onClear;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const action = coursePageKeyOf(event.key, whereOf(event.target));
      if (!action || (event.repeat && action !== 'find')) return;
      const press = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return false;
        element.click();
        return true;
      };
      if (action === 'find') {
        if (!inputRef.current) return;
        event.preventDefault();
        inputRef.current.focus();
      } else if (action === 'clear') clear.current();
      else if (action === 'enter') {
        if (press('[data-course-enter]')) event.preventDefault();
      } else if (press('[data-course-key="R"]')) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputRef]);
}
