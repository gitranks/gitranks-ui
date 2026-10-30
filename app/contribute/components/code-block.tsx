'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/** A 44px copy icon: it shows a tick, and says "Copied" to a screen reader from beside it, for a moment. */
export function CopyIcon({ text, label, tone = 'dark' }: { text: string; label: string; tone?: 'dark' | 'light' }) {
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
        className={cn(
          'flex size-11 flex-none items-center justify-center rounded-md transition-colors',
          tone === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-muted-foreground hover:text-foreground',
        )}
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
 * lines scroll sideways, unless `wrap` (a prompt).
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
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-zinc-900 dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pl-3.5">
        <span className={cn('min-w-0 truncate text-xs text-zinc-400', file && 'font-mono')}>{label}</span>
        <CopyIcon text={children} label={copyLabel} />
      </div>
      <pre
        className={cn(
          'px-3.5 py-3 font-mono text-[13px] leading-normal text-zinc-100',
          wrap ? 'whitespace-pre-wrap' : 'overflow-x-auto whitespace-pre',
        )}
      >
        {children}
      </pre>
    </div>
  );
}
