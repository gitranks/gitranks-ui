import { LandingProofCard } from './proof-card';
import { LandingStartButton } from './start-button';
import { WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { type AgentPageStats, agentPageStatsLineOf } from '@/lib/contribute/agent-page.types';
import { LANDING_HERO } from '@/lib/contribute/landing-copy';
import type { LandingProofPr } from '@/lib/contribute/landing-proof';
import { cn } from '@/lib/utils';
import type { LandingStart } from '@/lib/workspace/getting-in';

/**
 * The landing's head: the title, two sentences, the one button, and under it, as one group, the promise and the live
 * numbers line (left out when unread or when nothing is ready). Beside it the top card, one real pull request; without
 * one, the words take the full width. On a phone the card comes after the button's group.
 */
export function LandingHead({
  start,
  stats,
  card,
}: {
  start: LandingStart;
  stats: AgentPageStats | null;
  card: LandingProofPr | null;
}) {
  return (
    <section
      className={cn(WIDTH, 'flex flex-wrap items-center gap-9 pt-8 pb-11 sm:gap-14 sm:pt-14 sm:pb-16')}
      data-landing="head"
    >
      <div className={cn('flex min-w-0 flex-col gap-5', card ? 'flex-[1_1_480px]' : 'flex-[1_1_100%]')}>
        <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">{LANDING_HERO.title}</h1>
        <p className="m-0 max-w-xl text-lg text-foreground/80">{LANDING_HERO.lead}</p>
        <div className="flex flex-wrap gap-3">
          <LandingStartButton start={start} />
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p className="m-0">{LANDING_HERO.terms}</p>
          {stats?.readyIssues ? (
            <p className="m-0" data-landing="stats">
              {agentPageStatsLineOf(stats)}.
            </p>
          ) : null}
        </div>
      </div>
      {card ? <LandingProofCard pr={card} className="flex-[1_1_400px]" /> : null}
    </section>
  );
}
