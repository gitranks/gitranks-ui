'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { readLearnBar } from '@/components/learn/bar/learn-bar-live';
import { LearnDoorDue } from '@/components/workspace/learn-door';

/**
 * The count on the door into Learn: the lessons due, the same number as "Review" in Learn's bar, read in the browser
 * once the page is up and again on each move to another page, since a review changes it. The workspace's layout stays
 * the same for everyone, so it is read here and not on the server. Nothing with none due, and nothing while the read
 * is out or after it failed: the door keeps its room for the count either way.
 */
export function LearnDoorCount() {
  const pathname = usePathname();
  const [due, setDue] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each move to another page reads the count again.
  useEffect(() => {
    let live = true;
    void readLearnBar().then((bar) => {
      if (live) setDue(bar ? Math.max(0, bar.due) : 0);
    });
    return () => {
      live = false;
    };
  }, [pathname]);
  return <LearnDoorDue due={due} />;
}
