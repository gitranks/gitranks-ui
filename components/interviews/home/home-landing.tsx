import Link from 'next/link';

import { TEXT_LINK } from './home-parts';
import { HomeQuestions } from './home-questions';
import { HOME_STEPS } from '@/lib/interviews/home';
import { INTERVIEWS_RESEARCH_PATH } from '@/lib/interviews/paths';
import { cn } from '@/lib/utils';

/*
 * The landing's parts, for a visitor and a person with no plan in progress: what a plan is (above the search), then
 * how it works in three steps, where the facts come from, and questions.
 */

/** The top of the landing: the headline and what a plan is, in two sentences. */
export function HomeIntro() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 text-3xl font-bold tracking-tight text-balance">
        Prepare for the interview at the company you want
      </h1>
      <p className="m-0 max-w-[62ch] text-base leading-relaxed">
        A plan follows the real rounds of one company's interview, in order. For each round it gives you short lessons
        to learn and small projects to build with your own agent.
      </p>
    </div>
  );
}

/** How it works, in three steps. */
export function HomeSteps() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="interviews-how-title">
      <h2 id="interviews-how-title" className="m-0 text-xl font-bold tracking-tight">
        How it works
      </h2>
      <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
        {HOME_STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold tabular-nums">
              {index + 1}
            </span>
            <span className="text-sm font-semibold">{step.title}</span>
            <span className="text-sm text-muted-foreground">{step.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Where the facts come from, with the way to "How we research". */
export function HomeFacts() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="interviews-facts-title">
      <h2 id="interviews-facts-title" className="m-0 text-xl font-bold tracking-tight">
        Where the facts come from
      </h2>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <p className="m-0 text-sm">
          We read what each company publishes about its interviews, and what candidates report in public. Then we write
          the facts in our own words. Every fact on a page says who states it, the company or candidates, and opens its
          sources with their dates.
        </p>
        <p className="m-0 text-sm text-muted-foreground">
          These pages are not official, and no company takes part in them. If a fact is wrong, every page has “This is
          wrong”.
        </p>
        <Link href={INTERVIEWS_RESEARCH_PATH} className={cn('self-start text-sm', TEXT_LINK)}>
          How we research
        </Link>
      </div>
    </section>
  );
}

/** Questions, each answer opening in place. */
export function HomeQuestionsSection() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="interviews-faq-title">
      <h2 id="interviews-faq-title" className="m-0 text-xl font-bold tracking-tight">
        Questions
      </h2>
      <HomeQuestions />
    </section>
  );
}
