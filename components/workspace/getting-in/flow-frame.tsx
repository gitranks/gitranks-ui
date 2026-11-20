import { ArrowLeft } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { type FlowStepNumber, FlowSteps } from './flow-steps';
import { HEADING } from '@/components/workspace/primitives';
import type { FlowSide } from '@/lib/workspace/getting-in';

/**
 * A step of the flows that start Contribute and Learn, under the site header: no workspace tabs, the line of steps,
 * then the step in one narrow column.
 */
export function FlowFrame({ side, step, children }: { side: FlowSide; step: FlowStepNumber; children: ReactNode }) {
  return (
    <>
      <div className="border-b">
        <div className="mx-auto w-full max-w-3xl px-4 pt-1 pb-3">
          <FlowSteps side={side} current={step} />
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-9 pb-16" data-flow={side}>
        {children}
      </main>
    </>
  );
}

/** A step's title and its one line under it. */
export function FlowHead({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className={HEADING.page}>{title}</h1>
      <p className="max-w-prose text-base text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

/** A step's way back to the step before it, over its title. */
export function FlowBack({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-link max-sm:min-h-11"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
