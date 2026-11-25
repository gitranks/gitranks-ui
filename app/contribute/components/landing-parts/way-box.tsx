import type { LandingWay } from '@/lib/contribute/landing-copy';

/** A box of "Two ways to contribute": a line on top, a title, one paragraph, four facts. */
export function LandingWayBox({ way }: { way: LandingWay }) {
  return (
    <div className="flex min-w-0 flex-col gap-4.5 rounded-2xl border bg-card p-5 sm:p-7" data-landing-way="">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-primary">{way.top}</span>
        <h3 className="m-0 text-2xl font-bold">{way.title}</h3>
        <p className="m-0 text-foreground/80">{way.text}</p>
      </div>
      <dl className="m-0 grid grid-cols-1 gap-y-0.5 text-sm sm:grid-cols-[120px_1fr] sm:gap-x-4 sm:gap-y-2.5">
        {way.facts.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0 max-sm:mb-2">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
