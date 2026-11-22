import { HeartHandshake } from 'lucide-react';

import type { ApplyFormStart } from './apply-form';
import { ApplyPanel } from './apply-panel';
import { ApplyCard, ApplyContact } from './apply-parts';
import { ApplySignIn } from './apply-sign-in';
import { Header } from '@/components/header/header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ApplyRegistry, HeroApplyView } from '@/lib/unsung-hero/apply.types';
import {
  APPLY_HEADING,
  APPLY_LEAD,
  APPLY_UNAVAILABLE_TEXT,
  FREE_TEXT,
  FREE_TITLE,
  ONE_A_WEEK,
  PROFILE_SETTING_UP_TEXT,
} from '@/lib/unsung-hero/apply-copy';
import { APPLY_RULES, registryNamesOf } from '@/lib/unsung-hero/apply-prompt';

/** "What we look for": the rules, the registries we feature, one hero a week. */
function Rules({ registries }: Readonly<{ registries: readonly ApplyRegistry[] }>) {
  const names = registryNamesOf(registries);
  return (
    <section aria-labelledby="rules" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="rules" className="text-lg font-semibold">
          What we look for
        </h2>
        <p className="text-sm text-muted-foreground">
          {names ? `Packages from ${names}. ` : ''}We check every application ourselves; a person makes the call.
        </p>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {APPLY_RULES.map(({ title, text }, index) => (
          <li key={title} className="flex gap-3 rounded-xl border bg-card p-4 shadow-sm dark:shadow-none">
            <span className="font-mono text-sm text-muted-foreground tabular-nums">{index + 1}</span>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">{ONE_A_WEEK}</p>
    </section>
  );
}

/** The right column, by who looks and what the page read. */
function Column({
  view,
  signedIn,
  start,
}: Readonly<{ view: HeroApplyView | null; signedIn: boolean; start?: ApplyFormStart }>) {
  if (!signedIn) return <ApplySignIn />;
  if (!view) {
    return (
      <ApplyCard>
        <p role="status" className="text-sm text-muted-foreground">
          {APPLY_UNAVAILABLE_TEXT}
        </p>
      </ApplyCard>
    );
  }
  if (!view.viewer) {
    return (
      <ApplyCard>
        <p role="status" className="text-sm text-muted-foreground">
          {PROFILE_SETTING_UP_TEXT}
        </p>
      </ApplyCard>
    );
  }
  return <ApplyPanel key={view.viewer.login} login={view.viewer.login} view={view} start={start} />;
}

/**
 * `/unsung-heroes/apply`: what the slot is, that it is free, what we look for, and, signed in, the viewer's
 * application or the form to send one. A visitor sees the rules and the sign-in; so do crawlers. `start` is where the
 * form starts, for the catalogue's later steps.
 */
export function HeroApplyScreen({
  view,
  signedIn,
  start,
}: Readonly<{ view: HeroApplyView | null; signedIn: boolean; start?: ApplyFormStart }>) {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-10 pb-14">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Unsung heroes</span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{APPLY_HEADING}</h1>
          <p className="max-w-[62ch] text-lg text-muted-foreground">{APPLY_LEAD}</p>
        </div>
        <Alert role="note">
          <HeartHandshake aria-hidden="true" />
          <AlertTitle>{FREE_TITLE}</AlertTitle>
          <AlertDescription>{FREE_TEXT}</AlertDescription>
        </Alert>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Rules registries={view?.registries ?? []} />
          <div className="flex flex-col gap-4">
            <Column view={view} signedIn={signedIn} start={start} />
            <ApplyContact />
          </div>
        </div>
      </main>
    </>
  );
}
