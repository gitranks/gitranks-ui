import { describe, expect, it } from 'vitest';

import type { FactsState } from '../hooks/use-entity-facts';
import { parseBuilderQuery, pickTarget } from './builder-state';
import { builderView } from './builder-view';
import { repoMid } from '@/badge/v3/fixtures';

const state = (query: string) => parseBuilderQuery(new URLSearchParams(query));
const found: FactsState = { status: 'found', facts: repoMid };
/** The state a pick in step 1 writes. */
const pick = (query: string, name: string) => ({ ...pickTarget(state(query), 'repo', name), embed: false });

describe('builderView', () => {
  it('lands a badge kept from the gallery on Style when it has something to show for the entity', () => {
    const picked = pick('repo=&badge=rank&extra=month', 'acme/fastqueue');
    expect(builderView(picked, { wellFormed: true, factsState: found, badgeAvailable: true })).toEqual({
      step: 'style',
      notice: null,
    });
  });

  it('lands it on Badge with a note when it has nothing to show for the entity', () => {
    const picked = pick('repo=&badge=starred-by-card', 'acme/fastqueue');
    expect(builderView(picked, { wellFormed: true, factsState: found, badgeAvailable: false })).toEqual({
      step: 'badge',
      notice:
        'The “starred by top developers” badge has nothing to show for acme/fastqueue right now. Pick another one.',
    });
  });

  it('keeps Find for a badge picked before the entity, and goes back to Find for an entity it cannot find', () => {
    const gallery = state('repo=&badge=star-history');
    expect(builderView(gallery, { wellFormed: true, factsState: { status: 'idle' }, badgeAvailable: false })).toEqual({
      step: 'find',
      notice: null,
    });
    const missing = state('repo=acme/nothing&badge=star-history');
    expect(
      builderView(missing, { wellFormed: true, factsState: { status: 'missing' }, badgeAvailable: false }),
    ).toEqual({ step: 'find', notice: 'GitRanks has no repository called “acme/nothing” yet.' });
    expect(
      builderView(missing, { wellFormed: true, factsState: { status: 'error' }, badgeAvailable: false }).step,
    ).toBe('find');
  });

  it('shows the step the URL asks for while the entity loads', () => {
    const embed = state('repo=acme/fastqueue&badge=rank&step=embed');
    expect(builderView(embed, { wellFormed: true, factsState: { status: 'loading' }, badgeAvailable: false })).toEqual({
      step: 'embed',
      notice: null,
    });
  });
});
