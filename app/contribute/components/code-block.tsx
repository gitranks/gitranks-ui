'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A 44px copy icon: it shows a tick, and says "Copied" to a screen reader from beside it, for a moment. Its colours are
 * tokens, so it suits the surface it is on: inside a `CodeBlock` they are the dark theme's.
 */
export function CopyIcon({ text, label }: { text: string; label: string }) {
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
  className,
}: {
  /** Where it goes: a shell, a file's path, or the agent. */
  label: string;
  copyLabel: string;
  children: string;
  /** The label is a path, set in the mono face. */
  file?: boolean;
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('dark overflow-hidden rounded-xl bg-background text-foreground ring-1 ring-border', className)}>
      <div className="flex items-center justify-between gap-2 border-b pl-3.5">
        <span className={cn('min-w-0 truncate text-xs text-muted-foreground', file && 'font-mono')}>{label}</span>
        <CopyIcon text={children} label={copyLabel} />
      </div>
      <pre
        className={cn(
          'px-3.5 py-3 font-mono text-sm leading-normal',
          wrap ? 'whitespace-pre-wrap' : 'overflow-x-auto whitespace-pre',
        )}
      >
        {children}
      </pre>
    </div>
  );
}
