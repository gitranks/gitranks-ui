import { Check } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { SkillsMine } from '@/lib/skills/skills.types';
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

/**
 * The owner's page while it has nothing on it: `NEW` (uses no product) says what this area is for, with one box for
 * each product; `NOTHING_YET` gives each product the owner uses the step that puts the first thing on the page.
 * Nothing for a page with something on it.
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {start.boxes.map((box) => (
          <SkillsProductBox key={box.product} box={box} />
        ))}
      </div>
    </div>
  );
}
