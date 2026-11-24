import { Check } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { issueCellsOf, issuesTextOf } from '@/lib/skills/issue-numbers';
import type { SkillsIssueNumbers, SkillsMine } from '@/lib/skills/skills.types';
import { PRODUCT_BOX, type ProductBox, startOf } from '@/lib/skills/skills-owner';
import { cn } from '@/lib/utils';

/**
 * A product's box: what it is for and, as a promotion, its two points and the way to its landing; as a step, the one
 * thing that puts the first entry on the page. At the end of a page only its owner sees it, marked "Only you see this".
 */
export function SkillsProductBox({ box }: { box: ProductBox }) {
  const words = PRODUCT_BOX[box.product];
  const action = box.mode === 'promo' ? words.promo : words.step;
  return (
    <section
      aria-label={words.name}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5',
        box.onlyYou && 'border-dashed bg-transparent',
      )}
      data-product-box={box.product}
      data-mode={box.mode}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-lg font-semibold">{words.name}</h3>
        {box.onlyYou ? <span className="shrink-0 text-xs text-muted-foreground">Only you see this</span> : null}
      </div>
      <p className="m-0 text-sm font-medium text-foreground">{words.who}</p>
      {box.mode === 'promo' ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-foreground">
          {words.points.map((point) => (
            <li key={point} className="flex gap-2">
              <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">{words.step.text}</p>
      )}
      <Button asChild className="mt-auto self-start max-sm:min-h-11">
        <Link href={action.href} prefetch={false}>
          {action.label}
        </Link>
      </Button>
    </section>
  );
}

/** The box about our list of issues: why good issues are hard to find, how we read them, and four live numbers. */
export function SkillsIssuesBox({ numbers, learnOpen }: { numbers: SkillsIssueNumbers | null; learnOpen: boolean }) {
  const cells = issueCellsOf(numbers);
  return (
    <section aria-labelledby="skills-issues" className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <h3 id="skills-issues" className="m-0 text-lg font-semibold">
          We find the issues that really need a fix
        </h3>
        <p className="m-0 max-w-[82ch] text-sm text-muted-foreground">{issuesTextOf(numbers, learnOpen)}</p>
      </div>
      {cells.length ? (
        <dl
          className={cn(
            'm-0 grid grid-cols-2 gap-4 border-t pt-4',
            cells.length === 3 && 'sm:grid-cols-3',
            cells.length === 4 && 'sm:grid-cols-4',
          )}
        >
          {cells.map((cell) => (
            <div key={cell.label} className="flex min-w-0 flex-col items-center gap-0.5 text-center">
              <dt className="order-2 text-sm text-muted-foreground">{cell.label}</dt>
              <dd className="order-1 m-0 font-mono text-2xl font-bold tabular-nums">{cell.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

/**
 * The owner's page while it has nothing on it: `NEW` (uses neither product) says what this area is for, with the box
 * about our list of issues and one box for each product; `NOTHING_YET` gives each product the owner uses the step that
 * puts the first thing on the page. Learn's box and words are left out while Learn is not open to the owner. Nothing
 * for a page with something on it.
 */
export function SkillsStart({ mine }: { mine: SkillsMine }) {
  const start = startOf(mine);
  if (!start) return null;
  return (
    <div className="flex flex-col gap-8" data-skills-start={mine.state}>
      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-xl font-bold tracking-tight text-balance">{start.heading}</h3>
        <p className="m-0 max-w-[70ch] text-sm text-muted-foreground">{start.line}</p>
      </div>
      {start.numbers ? <SkillsIssuesBox numbers={mine.numbers} learnOpen={mine.learnOpen} /> : null}
      <div className={cn('grid grid-cols-1 gap-4', start.boxes.length > 1 && 'md:grid-cols-2')}>
        {start.boxes.map((box) => (
          <SkillsProductBox key={box.product} box={box} />
        ))}
      </div>
    </div>
  );
}
