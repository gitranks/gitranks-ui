import { SkillsLine } from './skills-line';
import type { SkillsNumbers } from '@/lib/skills/skills.types';
import { figureWordsOf, shownFigures, sinceLineOf } from '@/lib/skills/skills-figures';
import { cn } from '@/lib/utils';

/** The row's columns by how many figures it holds: one cell each, from a phone's two upwards. */
const COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

/**
 * The numbers box of a Skills page: a short row of figures, each centred in its cell, and one line under them (since
 * when, with which product). The tab draws its four at most (`numbers.figures`), the block its three
 * (`numbers.blockFigures`). A figure with nothing in it is left out, so no number is ever a zero. On a phone the figures go two in a row and an odd last one takes the whole
 * row. Nothing with no figure.
 */
export function SkillsNumbersBox({
  numbers,
  place = 'tab',
}: {
  numbers: SkillsNumbers;
  /** Whose figures to draw: the tab's, or the block's. */
  place?: 'tab' | 'block';
}) {
  const shown = shownFigures(place === 'block' ? numbers.blockFigures : numbers.figures);
  if (!shown.length) return null;
  return (
    <section
      aria-label="In numbers"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      data-skills-numbers=""
    >
      <dl className={cn('m-0 grid gap-4', COLUMNS[Math.min(shown.length, 4)])}>
        {shown.map((figure, index) => {
          const words = figureWordsOf(figure, numbers.kind, numbers.fixes);
          const oddLast = shown.length > 1 && shown.length % 2 === 1 && index === shown.length - 1;
          return (
            <div
              key={figure.key}
              data-figure={figure.key}
              className={cn('flex min-w-0 flex-col items-center gap-0.5 text-center', oddLast && 'max-sm:col-span-2')}
            >
              {/* The label first, as a list of terms reads; the number shows above it. */}
              <dt className="order-2 text-sm font-medium text-foreground">{words.label}</dt>
              <dd className={cn('order-1 m-0 text-2xl font-bold', words.mono && 'font-mono tabular-nums')}>
                {words.value}
              </dd>
              {words.under ? (
                <dd className="order-3 m-0 text-balance text-xs text-muted-foreground">{words.under}</dd>
              ) : null}
            </div>
          );
        })}
      </dl>
      <p className="m-0 border-t pt-3 text-sm text-muted-foreground">
        <SkillsLine parts={sinceLineOf(numbers)} />
      </p>
    </section>
  );
}
