import type { ReactNode } from 'react';

import { INTERVIEWS_COLUMN } from '../column';
import { AboutButtonLive } from './about-button-live';
import { AboutQuestions } from './about-questions';
import { ABOUT_FACTS, ABOUT_KEPT, ABOUT_LEAD, ABOUT_STEPS } from '@/lib/interviews/about';

/*
 * How it works, as the approved design draws it: one reading column, the same page for everyone. What a plan is with
 * its three steps; where the facts come from, six points written the same way; what is kept about you; questions;
 * one button, which the browser turns into "Back to your plans" for someone with plans.
 */

/** One part of the page: its heading and what it holds. */
function AboutPart({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id} data-interviews-about-part={id}>
      <h2 id={id} className="m-0 text-xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** How it works. */
export function AboutView() {
  return (
    <main className={INTERVIEWS_COLUMN} data-interviews-page="about">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-balance text-3xl font-bold tracking-tight">How Interviews works</h1>
        <p className="m-0 max-w-[62ch] text-base leading-relaxed">{ABOUT_LEAD}</p>
      </div>

      <AboutPart id="interviews-about-steps" title="A plan, step by step">
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {ABOUT_STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold tabular-nums">
                {index + 1}
              </span>
              <span className="text-sm font-semibold">{step.title}</span>
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </li>
          ))}
        </ol>
      </AboutPart>

      <AboutPart id="interviews-about-facts" title="Where the facts come from">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-3">
          {ABOUT_FACTS.map((fact) => (
            <div key={fact.title} className="flex flex-col gap-1" data-interviews-about-fact="">
              <h3 className="m-0 text-sm font-semibold">{fact.title}</h3>
              <p className="m-0 text-sm text-muted-foreground">{fact.text}</p>
            </div>
          ))}
        </div>
      </AboutPart>

      <AboutPart id="interviews-about-kept" title="What is kept about you">
        <p className="m-0 max-w-[66ch] text-sm text-muted-foreground">{ABOUT_KEPT}</p>
      </AboutPart>

      <AboutPart id="interviews-about-questions" title="Questions">
        <AboutQuestions />
      </AboutPart>

      <div className="flex flex-wrap items-center gap-3">
        <AboutButtonLive />
      </div>
    </main>
  );
}
