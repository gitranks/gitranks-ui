'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The sentence a person says in their agent, with Copy beside it: a build moves in the agent, so this sentence is the
 * box's action where no test waits. Copy says "Copied" for a moment, and tells a screen reader so.
 */
export function ProjectSay({ sentence }: { sentence: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sentence);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div data-project-say className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <code className="min-w-0 truncate font-mono text-[13px]">{sentence}</code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center justify-center rounded-md border bg-background px-2 py-0.5 text-xs font-medium shadow-xs hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </div>
  );
}
