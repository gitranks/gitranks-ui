'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ComponentProps, useEffect, useState } from 'react';

import { readFlowBookmark } from './flow-bookmark';
import type { FlowSide } from '@/lib/workspace/getting-in';
import { resumeHrefOf } from '@/lib/workspace/getting-in-bookmark';

/**
 * A landing's one button: a plain link to the server's step (`href`, the same for every visitor), swapped after the
 * page loads for this browser's bookmark when that is where the person resumes (`resumeHrefOf`).
 */
export function ResumeLink({
  side,
  href,
  signedIn,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & { side: FlowSide; href: Route; signedIn: boolean }) {
  const [to, setTo] = useState<Route>(href);
  useEffect(() => {
    setTo(resumeHrefOf({ side, server: href, signedIn, bookmark: readFlowBookmark(side) }));
  }, [side, href, signedIn]);
  return <Link href={to} prefetch={false} {...props} />;
}
