'use client';

import { Check, Share } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** How long the button reads "Link copied". */
const COPIED_MS = 2000;

const COPIED = 'Link copied';

/** Both words in the same cell of the button, so it is as wide as the longer one whichever shows. */
const WORDS = 'col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5';

/** Whether the browser offers its share sheet and the main way in is touch: a phone or a tablet. */
const sharesBySheet = () =>
  typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches === true;

/**
 * The one button that shares a page: it copies the page's address and reads "Link copied" for two seconds in the same
 * button, which keeps its size (both words are laid out in it, one hidden). On a touch screen with the browser's share
 * sheet, that opens instead. When the browser refuses to copy, the address shows in a field beside it, selected, to
 * copy by hand.
 */
export function ShareButton({
  href,
  label = 'Share',
  title,
  className,
}: {
  /** The address to share: a path on this site, or a full address. */
  href: string;
  /** The button's words. */
  label?: string;
  /** The page's name, for the share sheet. */
  title?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'refused'>('idle');
  const [url, setUrl] = useState(href);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setState('copied');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('idle'), COPIED_MS);
    } catch {
      setState('refused');
    }
  };

  const share = async () => {
    const address = new URL(href, window.location.origin).toString();
    setUrl(address);
    if (sharesBySheet()) {
      try {
        await navigator.share({ title, url: address });
        return;
      } catch (error) {
        // Closed without sharing: nothing to say. Any other failure copies instead.
        if ((error as { name?: unknown } | null)?.name === 'AbortError') return;
      }
    }
    await copy(address);
  };

  const copied = state === 'copied';
  return (
    <>
      <Button type="button" variant="outline" onClick={share} className={className}>
        <span className="grid">
          <span data-shown={!copied} aria-hidden={copied} className={cn(WORDS, copied && 'invisible')}>
            <Share aria-hidden="true" />
            {label}
          </span>
          <span data-shown={copied} aria-hidden={!copied} className={cn(WORDS, !copied && 'invisible')}>
            <Check aria-hidden="true" />
            {COPIED}
          </span>
        </span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? COPIED : ''}
      </span>
      {state === 'refused' ? (
        <input
          readOnly
          // biome-ignore lint/a11y/noAutofocus: the field appears because the press could not copy; it takes the focus so the address can be copied at once.
          autoFocus
          value={url}
          aria-label="The link to copy"
          onFocus={(event) => event.currentTarget.select()}
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs"
        />
      ) : null}
    </>
  );
}
