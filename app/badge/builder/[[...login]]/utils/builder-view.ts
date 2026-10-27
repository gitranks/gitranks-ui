import type { FactsState } from '../hooks/use-entity-facts';
import { entityName } from './badge-options';
import { type BuilderState, type BuilderStep, stepOf } from './builder-state';
import type { BadgeDefinition } from '@/badge/v3/catalogue';
import { awaitsRead, type EntityFacts } from '@/badge/v3/facts';
import { awaitsReadFor } from '@/badge/v3/pending';
import type { EntityKind } from '@/badge/v3/types';

const KIND_NAMES: Record<EntityKind, string> = { user: 'developer', org: 'organization', repo: 'repository' };

/** What a badge is called by its format: "the “stars” card". */
export const FORMAT_NAMES: Record<BadgeDefinition['format'], string> = {
  shield: 'badge',
  card: 'card',
  chart: 'chart',
};

/**
 * Whether the builder says the entity waits on a read: a developer whose first read is running, or a repository
 * without its star history when the URL's badge reads that history (see `awaitsReadFor`). Rank, language and stars
 * badges draw the same without it, so the note never shows for them.
 */
export function showsReadNote(facts: EntityFacts, badge: BadgeDefinition | null): boolean {
  if (facts.kind === 'user') return awaitsRead(facts);
  return !!badge && badge.entity === facts.kind && awaitsReadFor(facts, badge.id);
}

/**
 * The step the builder shows, and why it is not the one the URL asks for: an entity it cannot find goes back to
 * step 1; a badge with nothing to show for the entity (one kept from the gallery, say) goes back to step 2.
 * `badgeAvailable` tells whether the URL's badge, its options settled, has something to show for the entity.
 */
export function builderView(
  state: Pick<BuilderState, 'kind' | 'name' | 'badge' | 'embed'>,
  { wellFormed, factsState, badgeAvailable }: { wellFormed: boolean; factsState: FactsState; badgeAvailable: boolean },
): { step: BuilderStep; notice: string | null } {
  const step = stepOf(state);
  if (step === 'find' || !state.kind || !state.name) return { step, notice: null };
  if (!wellFormed || factsState.status === 'missing') {
    return { step: 'find', notice: `GitRanks has no ${KIND_NAMES[state.kind]} called “${state.name}” yet.` };
  }
  if (factsState.status === 'error') {
    return { step: 'find', notice: 'GitRanks could not look that up just now. Try again in a moment.' };
  }
  if (factsState.status === 'found' && state.badge && !badgeAvailable) {
    return {
      step: 'badge',
      notice: `The “${state.badge.title}” ${FORMAT_NAMES[state.badge.format]} has nothing to show for ${entityName(factsState.facts)} right now. Pick another one.`,
    };
  }
  return { step, notice: null };
}
