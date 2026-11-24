'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { OwnerBoxView, useOwnerReads } from './profile-contribute';
import { SkillsBlock } from '@/components/skills/skills-block';
import type { SkillsBriefAnswer } from '@/lib/skills/skills.types';
import { readSkillsBrief } from '@/lib/skills/skills-brief-read';
import { overviewBlockOf } from '@/lib/skills/skills-overview';
import { loginFromPath } from '@/utils/login-from-path';
import { isProfileOwner } from '@/utils/profile-owner';

/**
 * The overview's Skills block, and above it the box only the profile's owner sees, both read in the browser after the
 * cached page loads, so neither moves the cards above them. Each is put in once, never held open and never taken back.
 *
 * - The block: the person's public numbers, the same for every reader (the tab reads the same answer). It holds no
 *   place while it loads, and adds nothing without a public page. The owner of a page only they see gets it from
 *   their own view, with its line.
 * - The owner's box: for the owner alone. The owner gets the box and the block together, once every read of theirs is
 *   in; a box with nothing to list draws nothing, and the block then comes alone. Nothing while the session is unknown,
 *   so the owner never sees the block come and go.
 *
 * `colors`: the profile's languages, for the box's rows.
 */
export function ProfileSkills({ login, colors }: { login: string; colors?: Readonly<Record<string, string>> }) {
  const { data: session, status } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const profile = loginFromPath(login);
  const owner = isProfileOwner(viewer, profile);
  // The numbers' read once it is in (its answer null on a failure); null while it is on its way.
  const [brief, setBrief] = useState<{ answer: SkillsBriefAnswer | null } | null>(null);
  const reads = useOwnerReads(viewer, profile);

  useEffect(() => {
    setBrief(null);
    let live = true;
    readSkillsBrief(profile).then((answer) => {
      if (live) setBrief({ answer });
    });
    return () => {
      live = false;
    };
  }, [profile]);

  if (status === 'loading' || !brief || (owner && !reads)) return null;
  const block = overviewBlockOf(brief.answer, owner ? (reads?.skills.block ?? null) : null);
  return (
    <>
      {owner && reads ? <OwnerBoxView reads={reads} colors={colors} /> : null}
      {block ? (
        <SkillsBlock login={profile} numbers={block.numbers} ownState={block.ownState} learnOpen={block.learnOpen} />
      ) : null}
    </>
  );
}
