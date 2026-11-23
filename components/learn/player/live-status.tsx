'use client';

import { useEffect, useState } from 'react';

/**
 * A live region that is on the page before its words: drawn empty, then filled once mounted, so a screen reader that
 * only reads changes to a region already there reads them.
 */
export function LiveStatus({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState('');
  useEffect(() => setShown(text), [text]);
  return (
    <span role="status" className={className} data-live-status="">
      {shown}
    </span>
  );
}
