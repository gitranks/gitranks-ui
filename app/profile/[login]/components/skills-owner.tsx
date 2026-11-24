'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { setSkillsHiddenAction } from './skills-hidden.actions';
import { SkillsStrip } from '@/components/skills/skills-strip';
import { SKILLS_MINE_PATH, skillsPath } from '@/lib/skills/paths';
import type { SkillsHiddenResult, SkillsMine, SkillsMineAnswer } from '@/lib/skills/skills.types';
import { mineAfterOf } from '@/lib/skills/skills-view';
import { loginFromPath } from '@/utils/login-from-path';

/*
 * The owner's layer of a Skills address. The page is cached and the same for everyone, so who is reading is learnt here,
 * in the browser: the session first (is this the owner?), then the owner's own view, never kept. The server routes and
 * the action check the session again.
 */

/** The owner's view as this browser holds it, with the time it arrived at, for the dates of a page drawn from it. */
export type OwnerView = { mine: SkillsMine | null; at: Date };

/**
 * Whether the signed-in reader owns the profile at `login`, and their view of its Skills page once it arrives (`view`
 * stays null until then; its `mine` is null when it could not be read). `toggle` hides or shows the page in place.
 */
export function useSkillsOwner(login: string) {
  const { data: session } = useSession();
  const owner = !!login && session?.user.githubLogin?.toLowerCase() === loginFromPath(login).toLowerCase();
  const [view, setView] = useState<OwnerView | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!owner) return;
    let live = true;
    fetch(SKILLS_MINE_PATH, { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<SkillsMineAnswer>) : null))
      .catch(() => null)
      .then((answer) => {
        if (live) setView({ mine: answer?.mine ?? null, at: new Date() });
      });
    return () => {
      live = false;
    };
  }, [owner]);

  const toggle = useCallback(
    (hidden: boolean) =>
      startTransition(async () => {
        let result: SkillsHiddenResult;
        try {
          result = await setSkillsHiddenAction(hidden);
        } catch {
          result = { ok: false, error: 'FAILED' };
        }
        if (!result.ok) {
          toast.error(
            result.error === 'SIGNED_OUT'
              ? 'Sign in again to change who can see your page.'
              : 'Your page could not be changed. Try again.',
          );
          return;
        }
        setView((before) => (before?.mine ? { mine: mineAfterOf(before.mine, result.mine), at: before.at } : before));
      }),
    [],
  );

  return { owner, view, pending, toggle };
}

/** The tab's heading, above the strip. */
export function SkillsHeading() {
  return <h2 className="text-xl font-semibold tracking-tight">Skills</h2>;
}

/** The strip's row before the owner's view arrives: the strip's own height, so nothing moves when it does. */
export function StripRow() {
  return <div aria-hidden="true" className="min-h-14" data-skills-strip-row="" />;
}

/** The owner's strip for `mine`, wired to hide and show the page. */
export function OwnerStrip({
  login,
  mine,
  pending,
  toggle,
}: {
  login: string;
  mine: SkillsMine;
  pending: boolean;
  toggle: (hidden: boolean) => void;
}) {
  return (
    <SkillsStrip
      mine={mine}
      href={skillsPath(loginFromPath(login))}
      onHide={() => toggle(true)}
      onShow={() => toggle(false)}
      pending={pending}
    />
  );
}
