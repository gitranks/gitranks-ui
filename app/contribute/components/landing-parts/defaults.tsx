import { H2, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { LANDING_DEFAULTS, LANDING_DEFAULTS_HEAD } from '@/lib/contribute/landing-copy';
import { cn } from '@/lib/utils';

/** What is set for a new person, six of them in two rows of three; all of it in Settings. */
export function LandingDefaults() {
  return (
    <section className="border-t" data-landing="defaults">
      <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
        <div className="flex flex-col gap-2">
          <h2 className={H2}>{LANDING_DEFAULTS_HEAD.title}</h2>
          <p className="m-0 max-w-3xl text-muted-foreground">{LANDING_DEFAULTS_HEAD.text}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_DEFAULTS.map(({ title, text }) => (
            <div key={title} className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-5">
              <h3 className="m-0 font-bold">{title}</h3>
              <p className="m-0 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
