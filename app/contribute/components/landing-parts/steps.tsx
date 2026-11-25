import { H2, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { LANDING_STEPS, LANDING_STEPS_TITLE, landingStepLabelOf } from '@/lib/contribute/landing-copy';
import { cn } from '@/lib/utils';

/** "From an issue to a merged pull request": four steps, named like the stages of a pull request. */
export function LandingSteps() {
  return (
    <section className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')} data-landing="steps">
      <h2 className={H2}>{LANDING_STEPS_TITLE}</h2>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 p-0">
        {LANDING_STEPS.map(({ who, title, text }, index) => (
          <li key={who} className="flex min-w-0 flex-col gap-2">
            <span className="font-mono text-xs text-primary">{landingStepLabelOf(index, who)}</span>
            <span className="font-bold">{title}</span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
