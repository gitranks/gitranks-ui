'use client';

import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { skillsPath } from '@/lib/skills/paths';
import type { SkillsHiddenResult, SkillsMine } from '@/lib/skills/skills.types';
import { PRIVACY_UNREAD_LINE, privacyRowOf } from '@/lib/skills/skills-privacy';
import { cn } from '@/lib/utils';

/** One side of the choice: pressed when it is the one made. */
function Side({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={pressed ? undefined : onClick}
      className={cn('max-sm:min-h-11', pressed && 'bg-muted font-semibold text-foreground')}
    >
      {children}
    </Button>
  );
}

/**
 * Settings' group "Privacy", before "Delete all data": the row "Your Skills page", with "Everyone" or "Only you", the
 * same switch as the strip on the page. While nothing is on the page, or only its owner may see it, the row says so and
 * offers no choice. The change is `setHidden`, given by the page (this folder changes no data itself).
 */
export function SkillsPrivacyGroup({
  login,
  mine: initial,
  setHidden,
}: {
  login: string;
  /** The owner's view: null or undefined when it could not be read. */
  mine: SkillsMine | null | undefined;
  setHidden: (hidden: boolean) => Promise<SkillsHiddenResult>;
}) {
  const [mine, setMine] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const row = privacyRowOf(mine);

  const choose = (hidden: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await setHidden(hidden).catch((): SkillsHiddenResult => ({ ok: false, error: 'FAILED' }));
      if (!result.ok) {
        setError(result.error === 'SIGNED_OUT' ? 'Sign in again to change this.' : 'That did not work. Try again.');
        return;
      }
      if (result.mine) setMine(result.mine);
    });

  return (
    <SettingsGroup id="privacy" title="Privacy">
      <SettingsList>
        <SettingsRow
          icon={UserRound}
          title={
            <Link href={skillsPath(login)} prefetch={false} className="hover:underline">
              Your Skills page
            </Link>
          }
          value={
            <>
              {row?.line ?? PRIVACY_UNREAD_LINE}
              {error ? (
                <span role="alert" className="block text-destructive">
                  {error}
                </span>
              ) : null}
            </>
          }
          data={{ 'data-skills-privacy': mine?.state ?? 'unread' }}
        >
          {row?.choice ? (
            <fieldset aria-label="Who can see your Skills page" className="flex gap-1 rounded-md border p-0.5">
              <Side pressed={!row.choice.hidden} disabled={pending} onClick={() => choose(false)}>
                Everyone
              </Side>
              <Side pressed={row.choice.hidden} disabled={pending} onClick={() => choose(true)}>
                Only you
              </Side>
            </fieldset>
          ) : null}
        </SettingsRow>
      </SettingsList>
    </SettingsGroup>
  );
}
