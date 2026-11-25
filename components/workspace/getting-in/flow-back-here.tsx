'use client';

import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { FlowBack } from './flow-frame';
import { flowWayBackOf, withFlowWayBack } from '@/lib/workspace/flow-way-back';

function FlowBackWithWayBack({ href, children }: { href: Route; children: ReactNode }) {
  const issue = flowWayBackOf(useSearchParams());
  return <FlowBack href={withFlowWayBack(href, issue) as Route}>{children}</FlowBack>;
}

/**
 * A step's way back to the step before it (`FlowBack`), with the way back to an issue (`?issue=`) the address carries.
 * The address is read in the browser, so the link is in the page's first paint without it and gains it once drawn.
 */
export function FlowBackHere({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Suspense fallback={<FlowBack href={href}>{children}</FlowBack>}>
      <FlowBackWithWayBack href={href}>{children}</FlowBackWithWayBack>
    </Suspense>
  );
}
