'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';

/** What a copy that did not go through says. */
export const COPY_FAILED = 'Copy did not work. Select the text and copy it.';

/**
 * A button (outline unless `variant` says) that copies `text`, says "Copied" for a moment, and tells a screen reader
 * so. `onCopy` hears of each copy that went through. A browser that cannot copy (no clipboard, or a refused write)
 * says so in a toast.
 */
export function CopyButton({
  text,
  label,
  className,
  variant = 'outline',
  disabled = false,
  onCopy,
  source,
}: {
  text: string;
  label: string;
  className?: string;
  /** `default` where copying is the view's main action; else an outline button (today's callers). */
  variant?: 'outline' | 'default';
  disabled?: boolean;
  onCopy?: () => void;
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
      onCopy?.();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      toast.error(COPY_FAILED);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={copy}
        disabled={disabled}
        className={cn('min-h-11 sm:min-h-10', className)}
        {...(source ? contributeSource(source) : {})}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Copied' : label}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}
