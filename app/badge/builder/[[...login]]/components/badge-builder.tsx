'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { seedEntityFacts, useEntityFacts } from '../hooks/use-entity-facts';
import { entityName, offeredBadges, settleStyle } from '../utils/badge-options';
import {
  BUILDER_KEYS,
  type BuilderQuery,
  type BuilderState,
  type BuilderStep,
  builderHref,
  cleanStyle,
  isEntityName,
  parseBuilderQuery,
  pickTarget,
  type Style,
  stepOf,
} from '../utils/builder-state';
import { BadgeStep } from './badge-step';
import { EmbedStep } from './embed-step';
import { FindStep } from './find-step';
import { StepsBar } from './steps-bar';
import { StyleStep } from './style-step';
import type { BadgeDefinition } from '@/badge/v3/catalogue';
import type { EntityKind } from '@/badge/v3/types';
import { Skeleton } from '@/components/ui/skeleton';

const PARSERS = Object.fromEntries(BUILDER_KEYS.map((key) => [key, parseAsString])) as Record<
  (typeof BUILDER_KEYS)[number],
  typeof parseAsString
>;

/** Every builder key cleared, so an update writes exactly the state it names. */
const CLEARED = Object.fromEntries(BUILDER_KEYS.map((key) => [key, null])) as BuilderQuery;

export type Go = (
  next: {
    kind: EntityKind | null;
    name?: string | null;
    badge?: BadgeDefinition | null;
    style?: Style;
    embed?: boolean;
  },
  options?: { replace?: boolean },
) => void;

const KIND_NAMES: Record<EntityKind, string> = { user: 'developer', org: 'organization', repo: 'repository' };

/** The four steps of `/badge/builder`, all in the URL (see `builder-state.ts`). */
export function BadgeBuilder() {
  const [query, setQuery] = useQueryStates(PARSERS);
  const state: BuilderState = useMemo(() => parseBuilderQuery(query), [query]);
  const wellFormed = !state.kind || !state.name || isEntityName(state.kind, state.name);
  // Bumped by a pick in step 1, so the same entity is asked again after a failed lookup.
  const [attempt, setAttempt] = useState(0);
  const factsState = useEntityFacts(state.kind, wellFormed ? state.name : null, attempt);

  const go: Go = useCallback(
    ({ kind, name = null, badge = null, style = {}, embed = false }, { replace = false } = {}) => {
      const next: BuilderQuery = { ...CLEARED };
      if (kind) next[kind] = name ?? '';
      if (kind && name && badge) {
        next.badge = badge.id;
        Object.assign(next, cleanStyle(badge, style));
        if (embed) next.step = 'embed';
      }
      setQuery(next, { history: replace ? 'replace' : 'push', scroll: false });
    },
    [setQuery],
  );

  const facts = factsState.status === 'found' ? factsState.facts : null;

  // Another spelling or an old name: the stored one, so the badge URL matches the entity's own.
  useEffect(() => {
    if (facts && state.kind && entityName(facts) !== state.name) {
      setQuery({ [state.kind]: entityName(facts) }, { history: 'replace', scroll: false });
    }
  }, [facts, state.kind, state.name, setQuery]);

  const now = useMemo(() => new Date(), []);
  const offered = useMemo(() => (facts ? offeredBadges(facts, now) : []), [facts, now]);
  // An option that does not apply to this entity (a country rank it lacks, a wall order it has no people in) is
  // dropped, as the Style step drops it, before the badge counts as unavailable.
  const settled = useMemo(
    () => (facts && state.badge ? settleStyle(facts, state.badge, state.style, now) : null),
    [facts, state.badge, state.style, now],
  );
  const badgeAvailable = !!settled;
  const settledDiffers = !!settled && JSON.stringify(settled) !== JSON.stringify(state.style);
  useEffect(() => {
    if (facts && state.badge && settled && settledDiffers) {
      go(
        { kind: facts.kind, name: entityName(facts), badge: state.badge, style: settled, embed: state.embed },
        { replace: true },
      );
    }
  }, [facts, state.badge, state.embed, settled, settledDiffers, go]);

  let step: BuilderStep = stepOf(state);
  let notice: string | null = null;
  if (step !== 'find' && state.kind && state.name) {
    if (!wellFormed || factsState.status === 'missing') {
      notice = `GitRanks has no ${KIND_NAMES[state.kind]} called “${state.name}” yet.`;
      step = 'find';
    } else if (factsState.status === 'error') {
      notice = 'GitRanks could not look that up just now. Try again in a moment.';
      step = 'find';
    } else if (facts && state.badge && !badgeAvailable) {
      notice = `That badge has nothing to show for ${entityName(facts)} right now. Pick another one.`;
      step = 'badge';
    }
  }
  const loading = step !== 'find' && factsState.status !== 'found';

  // Focus follows the step, so a keyboard or screen reader user lands on the new step's heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = loading ? null : step;
  const previousStep = useRef<BuilderStep | null>(null);
  useEffect(() => {
    if (!shownStep) return;
    if (previousStep.current && previousStep.current !== shownStep) {
      headingRef.current?.focus();
    }
    previousStep.current = shownStep;
  }, [shownStep]);

  const hrefs: Record<BuilderStep, string> = {
    find: builderHref({ kind: null }),
    badge: builderHref({ kind: state.kind, name: state.name }),
    style: builderHref({ kind: state.kind, name: state.name, badge: state.badge, style: state.style }),
    embed: builderHref({ kind: state.kind, name: state.name, badge: state.badge, style: state.style, embed: true }),
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <StepsBar
        step={step}
        hrefs={hrefs}
        onStep={(target) => {
          if (target === 'find') go({ kind: null });
          if (target === 'badge') go({ kind: state.kind, name: state.name });
          if (target === 'style') go({ kind: state.kind, name: state.name, badge: state.badge, style: state.style });
        }}
      />

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : step === 'find' ? (
        <FindStep
          headingRef={headingRef}
          kind={state.kind}
          initialQuery={notice ? (state.name ?? '') : ''}
          notice={notice}
          onPick={(picked) => {
            seedEntityFacts(picked);
            setAttempt((count) => count + 1);
            go(pickTarget(state, picked.kind, entityName(picked)));
          }}
          onAnyKind={() => go({ kind: null })}
        />
      ) : facts && step === 'badge' ? (
        <BadgeStep
          headingRef={headingRef}
          facts={facts}
          offered={offered}
          notice={notice}
          changeHref={hrefs.find}
          onChange={() => go({ kind: null })}
          onPick={({ badge, style }) => go({ kind: facts.kind, name: entityName(facts), badge, style })}
        />
      ) : facts && state.badge && step === 'style' ? (
        <StyleStep
          headingRef={headingRef}
          facts={facts}
          badge={state.badge}
          style={state.style}
          now={now}
          onStyle={(badge, style) => go({ kind: facts.kind, name: entityName(facts), badge, style }, { replace: true })}
          onDone={() =>
            go({ kind: facts.kind, name: entityName(facts), badge: state.badge, style: state.style, embed: true })
          }
        />
      ) : facts && state.badge && step === 'embed' ? (
        <EmbedStep
          headingRef={headingRef}
          facts={facts}
          badge={state.badge}
          style={state.style}
          now={now}
          editHref={hrefs.style}
          onEdit={() => go({ kind: facts.kind, name: entityName(facts), badge: state.badge, style: state.style })}
        />
      ) : null}
    </div>
  );
}
