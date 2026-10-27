import { describe, expect, it } from 'vitest';

import type { FactsState } from '../hooks/use-entity-facts';
import { parseBuilderQuery, pickTarget } from './builder-state';
import { builderView, showsReadNote } from './builder-view';
import { findBadge } from '@/badge/v3/catalogue';
import { orgBig, repoBig, repoMid, userMid } from '@/badge/v3/fixtures';

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
        'The “starred by top developers” card has nothing to show for acme/fastqueue right now. Pick another one.',
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

describe('showsReadNote', () => {
  const repo = (id: string) => findBadge('repo', id);

  it("shows for a badge that reads a repository's missing star history", () => {
    expect(repoMid.history).toBeNull();
    for (const id of ['star-history', 'stars-card', 'month']) expect(showsReadNote(repoMid, repo(id))).toBe(true);
  });

  it('never shows for badges that draw the same without it, nor once the history is read', () => {
    for (const id of ['rank', 'language-rank', 'stars', 'rank-card'])
      expect(showsReadNote(repoMid, repo(id))).toBe(false);
    expect(showsReadNote(repoMid, null)).toBe(false);
    expect(showsReadNote(repoBig, repo('star-history'))).toBe(false);
  });

  it('shows for a developer whose first read is running, whatever the badge; never for an organization', () => {
    expect(showsReadNote({ ...userMid, s: null, c: null, f: null }, null)).toBe(true);
    expect(showsReadNote(userMid, findBadge('user', 'rank'))).toBe(false);
    expect(showsReadNote(orgBig, findBadge('org', 'rank'))).toBe(false);
  });
});
