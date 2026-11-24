'use client';

import { useRef, useState } from 'react';

import { OwnerStrip, StripRow, useSkillsOwner } from './skills-owner';
import { SkillsPageView } from '@/components/skills/skills-page-view';
import { skillsFixesApiPath } from '@/lib/skills/paths';
import type { SkillsFixesAnswer, SkillsPage } from '@/lib/skills/skills.types';
import { otherBoxOf } from '@/lib/skills/skills-owner';
import { moreFixesAfter, ownerLayerOf } from '@/lib/skills/skills-view';

/**
 * A public Skills page: the same content for everyone, drawn on the server, with "Show 20 more" adding fixes in place.
 * Its owner gets the strip above it (its row held from the moment the session says it is theirs) and, last, the box
 * about the product they do not use; hiding and showing change only the strip.
 */
export function SkillsScreen({
  login,
  page,
  learnOpen,
  now,
}: {
  login: string;
  page: SkillsPage;
  /** Whether Learn is open to everyone: the public page names nothing of Learn until it is. */
  learnOpen: boolean;
  /** The time the page was drawn at, for its dates. */
  now: Date;
}) {
  const { owner, view, pending, toggle } = useSkillsOwner(login);
  const [fixes, setFixes] = useState(page.fixes);
  const [loading, setLoading] = useState(false);
  const asking = useRef(false);

  const more = async () => {
    if (asking.current || !fixes.next) return;
    asking.current = true;
    setLoading(true);
    try {
      const response = await fetch(skillsFixesApiPath(login, fixes.next));
      const answer = response.ok ? ((await response.json()) as SkillsFixesAnswer) : null;
      if (answer?.fixes) setFixes((shown) => moreFixesAfter(shown, answer.fixes as NonNullable<typeof answer.fixes>));
    } catch {
      // The button stays: a press later asks again.
    } finally {
      asking.current = false;
      setLoading(false);
    }
  };

  const layer = owner && view ? ownerLayerOf(view.mine, true) : { kind: 'none' as const };
  const strip =
    layer.kind === 'none' ? (
      owner && !view ? (
        <StripRow />
      ) : null
    ) : (
      <OwnerStrip login={login} mine={layer.mine} pending={pending} toggle={toggle} />
    );

  return (
    <SkillsPageView
      page={{ ...page, fixes }}
      now={now}
      strip={strip}
      other={layer.kind === 'none' ? null : otherBoxOf(layer.mine)}
      learnOpen={learnOpen}
      onMore={fixes.next ? more : undefined}
      loadingMore={loading}
    />
  );
}
