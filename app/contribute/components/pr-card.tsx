import { Card, CardContent } from '@/components/ui/card';
import type { ContributePrCard } from '@/lib/contribute/contribute.types';
import { prCardFacts, prUrlOf } from '@/lib/contribute/pr-feedback';
import { cn } from '@/lib/utils';

/** The PR a note is about, as GitHub shows it: its title, `owner/repo#n`, who opened it and how. */
export function PrCardFacts({ card, className }: { card: ContributePrCard; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-base font-semibold text-balance break-words">
        {card.title ?? `Pull request #${card.number}`}
      </span>
      <span className="text-sm text-muted-foreground break-words">
        <a
          href={prUrlOf(card)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:underline"
        >
          {card.nameWithOwner}#{card.number}
        </a>
        {prCardFacts(card).map((fact) => (
          <span key={fact}> · {fact}</span>
        ))}
      </span>
    </div>
  );
}

/** The PR card on the report pages. */
export function PrCard({ card }: { card: ContributePrCard }) {
  return (
    <Card data-pr-card={card.attemptId} className="gap-0 py-4">
      <CardContent className="flex flex-col gap-1 px-4 sm:px-6">
        <span className="text-sm text-muted-foreground">Pull request</span>
        <PrCardFacts card={card} />
      </CardContent>
    </Card>
  );
}
