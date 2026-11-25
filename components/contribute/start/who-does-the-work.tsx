'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import {
  HOW_CONTRIBUTE_WORKS,
  MORE_ABOUT_CONTRIBUTE,
  START_WAYS,
  START_WAYS_TITLE,
  type StartWayBox,
  type StartWayButton,
  type StartWayName,
  type StartWays,
} from '@/lib/contribute/start-ways';
import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';
import { signInToFlow } from '@/lib/workspace/sign-in-to-flow';

/** "How Contribute works": three numbered lines, the same in every case, so nothing under them moves. */
export function HowContributeWorks({ fromIssueLine }: { fromIssueLine: string | null }) {
  return (
    <section aria-labelledby="how-contribute-works" className="flex flex-col gap-4" data-how-contribute-works="">
      {fromIssueLine ? (
        <p className="m-0 text-sm text-muted-foreground" data-from-issue="">
          {fromIssueLine}
        </p>
      ) : null}
      <h1 id="how-contribute-works" className="m-0 text-2xl font-bold tracking-tight text-balance md:text-3xl">
        How Contribute works
      </h1>
      <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
        {HOW_CONTRIBUTE_WORKS.map((line, index) => (
          <li key={line.lead} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            >
              {index + 1}
            </span>
            <p className="m-0 text-base">
              <span className="font-semibold">{line.lead}</span>{' '}
              <span className="text-muted-foreground">{line.rest}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const BUTTON = 'min-h-11 gap-2 px-4 font-semibold max-sm:w-full';

/** Where a box's link is counted from. */
const SOURCES = { own: 'contribute_flow_own', key: 'contribute_flow_key' } as const satisfies Record<StartWayName, ContributeSource>;

/** A box's button: a link, or for a visitor GitHub's sign-in that comes back to the way it names, the way back kept. */
function WayButton({ button, source }: { button: StartWayButton; source?: ContributeSource }) {
  const [pending, setPending] = useState(false);
  const variant = button.filled ? 'default' : 'outline';
  if (button.signIn) {
    return (
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        className={BUTTON}
        data-start-way-button=""
        {...contributeSource('contribute_flow_sign_in')}
        onClick={() => {
          setPending(true);
          signInToFlow(button.href).catch(() => setPending(false));
        }}
      >
        <FaGithub aria-hidden="true" className="size-4" />
        {button.label}
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} className={BUTTON}>
      <Link
        href={button.href as never}
        prefetch={false}
        data-start-way-button=""
        {...(source ? contributeSource(source) : {})}
      >
        {button.label}
      </Link>
    </Button>
  );
}

function WayTop({ top }: { top: StartWayBox['top'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold',
        top.tone === 'brand' && 'text-primary',
        top.tone === 'done' && 'text-positive',
        top.tone === 'warning' && 'text-warning-soft-foreground',
      )}
      data-way-top={top.tone}
    >
      {top.tone === 'done' ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
      {top.text}
    </span>
  );
}

/**
 * One way's box, the same parts in the same places: on the left a top line, a title, one sentence and the button; on
 * the right four facts. On a phone the facts go under the sentence and the button comes last, full width. A small box
 * is one row: the title, a short line and the button.
 */
function WayBox({ box }: { box: StartWayBox }) {
  const way = START_WAYS[box.name];
  if (box.small) {
    return (
      <section
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border bg-card px-6 py-4"
        data-start-way={box.name}
        data-small=""
      >
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
          <span className="text-sm font-semibold">{way.title}</span>
          <span className="text-sm text-muted-foreground">{box.small.line}</span>
        </div>
        {box.button ? <WayButton button={box.button} source={SOURCES[box.name]} /> : null}
      </section>
    );
  }
  return (
    <section
      aria-labelledby={`start-way-${box.name}`}
      className="grid gap-x-8 gap-y-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6 md:grid-cols-[minmax(0,1fr)_336px] dark:shadow-none"
      data-start-way={box.name}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <WayTop top={box.top} />
        <h2 id={`start-way-${box.name}`} className="m-0 text-lg font-semibold">
          {way.title}
        </h2>
        <p className="m-0 text-sm text-muted-foreground">{way.text}</p>
      </div>
      <dl className="m-0 grid content-start grid-cols-[76px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm md:row-span-2">
        {way.facts.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0">{value}</dd>
          </div>
        ))}
      </dl>
      {box.button ? (
        <div className="mt-auto max-md:order-last">
          <WayButton button={box.button} source={SOURCES[box.name]} />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Step 1 of Contribute's flow: how Contribute works, then who does the work, two boxes one under the other, and "More
 * about Contribute". Every case is the same page: only a box's top line and its button change (`startWaysOf`).
 */
export function WhoDoesTheWork({ ways }: { ways: StartWays }) {
  return (
    <div className="flex flex-col gap-6" data-who-does-the-work="">
      <HowContributeWorks fromIssueLine={ways.fromIssueLine} />
      <div className="flex flex-col gap-2 border-t pt-7">
        <h2 className="m-0 text-xl font-bold tracking-tight text-balance">{START_WAYS_TITLE}</h2>
        <p className="m-0 max-w-prose text-base text-muted-foreground">{ways.headLine}</p>
        {ways.visitorLine ? <p className="m-0 text-sm text-muted-foreground">{ways.visitorLine}</p> : null}
      </div>
      <div className="flex flex-col gap-4">
        {ways.boxes.map((box) => (
          <WayBox key={box.name} box={box} />
        ))}
      </div>
      {ways.next ? (
        <div>
          <WayButton button={ways.next} />
        </div>
      ) : null}
      <p className="m-0 text-sm">
        <Link href={MORE_ABOUT_CONTRIBUTE.href} className="font-semibold text-link hover:underline">
          {MORE_ABOUT_CONTRIBUTE.label} →
        </Link>
      </p>
    </div>
  );
}
