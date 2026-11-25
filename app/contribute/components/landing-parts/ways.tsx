import { LandingWayBox } from './way-box';
import { H2, MUTED_SECTION, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { LANDING_WAYS, LANDING_WAYS_HEAD } from '@/lib/contribute/landing-copy';
import { cn } from '@/lib/utils';

/** "Two ways to contribute": two boxes of the same parts, the hosted agent first. */
export function LandingWays() {
  return (
    <section id="ways" className={cn(MUTED_SECTION, 'scroll-mt-4')}>
      <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
        <div className="flex flex-col gap-2">
          <h2 className={H2}>{LANDING_WAYS_HEAD.title}</h2>
          <p className="m-0 max-w-3xl text-muted-foreground">{LANDING_WAYS_HEAD.text}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
          {LANDING_WAYS.map((way) => (
            <LandingWayBox key={way.title} way={way} />
          ))}
        </div>
      </div>
    </section>
  );
}
