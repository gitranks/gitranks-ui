'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';

/**
 * A 44px copy icon: it shows a tick, and says "Copied" to a screen reader from beside it, for a moment. Its colours are
 * tokens, so it suits the surface it is on: inside a `CodeBlock` they are the dark theme's.
 */
export function CopyIcon({
  text,
  label,
  source,
}: {
  text: string;
  label: string;
  /** Counts each copy as a click from this place (`contributeSource`). */
  source?: ContributeSource;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="flex size-11 flex-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        {...(source ? contributeSource(source) : {})}
      >
        {copied ? (
          <Check aria-hidden="true" className="size-4" strokeWidth={2.4} />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
      </button>
      {/* Beside the button, not in it: a button's name is its label, and its children are not announced. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}

/**
 * A command, a config or a prompt to copy: a dark block with a header (where it goes) and a copy icon inside. Long
 * lines scroll sideways, unless `wrap` (a prompt). The block sets the dark theme on itself (`dark`), so its tokens are
 * the dark theme's in both.
 */
export function CodeBlock({
  label,
  copyLabel,
  children,
  file = false,
  wrap = false,
  tall,
  className,
  copySource,
}: {
  /** Where it goes: a shell, a file's path, or the agent. */
  label: string;
  /** The copy icon's name; none: no icon (the page has its own copy control). */
  copyLabel?: string;
  children: string;
  /** The label is a path, set in the mono face. */
  file?: boolean;
  wrap?: boolean;
  /**
   * A long text: the block stops at 36rem and scrolls, and takes the keyboard's focus so it scrolls without a mouse too
   * (Safari focuses no scroll box by itself). Its value names the region for a screen reader.
   */
  tall?: string;
  className?: string;
  /** Counts each copy as a click from this place (`contributeSource`). */
  copySource?: ContributeSource;
}) {
  return (
    <div className={cn('dark overflow-hidden rounded-xl bg-background text-foreground ring-1 ring-border', className)}>
      <div className={cn('flex items-center justify-between gap-2 border-b pl-3.5', !copyLabel && 'py-2.5 pr-3.5')}>
        <span className={cn('min-w-0 truncate text-xs text-muted-foreground', file && 'font-mono')}>{label}</span>
        {copyLabel ? <CopyIcon text={children} label={copyLabel} source={copySource} /> : null}
      </div>
      <pre
        className={cn(
          'px-3.5 py-3 font-mono text-sm leading-normal',
          wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'overflow-x-auto whitespace-pre',
          tall && 'max-h-[36rem] overflow-y-auto focus-visible:outline-2 focus-visible:outline-ring',
        )}
        {...(tall ? { tabIndex: 0, role: 'region', 'aria-label': tall } : {})}
      >
        {children}
      </pre>
    </div>
  );
}
