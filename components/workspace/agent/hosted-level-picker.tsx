'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { Pill } from '@/components/pill/pill';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AUTOPILOT_NO_EMAIL,
  AUTOPILOT_NO_EMAIL_ON,
  AutopilotConfirm,
  AutopilotHowLink,
  autopilotErrorMessage,
} from '@/components/workspace/autopilot';
import { HEADING } from '@/components/workspace/primitives';
import { useSettledPick } from '@/components/workspace/settings/radio-pills';
import { cn } from '@/lib/utils';
import { saveContributeSettings } from '@/lib/workspace/actions';
import type { ContributeAutopilot, ContributeHostedLevel } from '@/lib/workspace/contribute.types';
import { AUTOPILOT_UNLOCK_AT } from '@/lib/workspace/format';
import {
  AUTOPILOT_LOCK_AT,
  autopilotChoiceOf,
  HOSTED_LEVELS,
  type LevelPickEvent,
  type LevelPicking,
  levelPickStep,
} from '@/lib/workspace/hosted-level';

/**
 * "How much it does by itself": the hosted agent's three levels as cards, the stored one selected. A pick is shown at
 * once and saved once the user stops picking (arrowing through the cards picks each in turn); Autopilot asks first.
 * A refused save puts the level back and says why under the card. Autopilot is disabled until it can be chosen (not
 * open yet, locked, no email), with its pill; chosen and then locked again, it stays selected and says it works as the
 * level above. `nextIssue`: when the agent starts its next issue by itself, said under a selected level that does.
 */
export function HostedLevelPicker({
  level,
  autopilot,
  login,
  nextIssue,
}: {
  level: ContributeHostedLevel;
  autopilot: ContributeAutopilot;
  login?: string;
  nextIssue: string | null;
}) {
  const router = useRouter();
  const id = useId();
  const [picking, setPicking] = useState<LevelPicking>({ saved: level, shown: level, confirming: false });
  const current = useRef(picking);
  const [saving, setSaving] = useState<ContributeHostedLevel | null>(null);
  const [error, setError] = useState<{ level: ContributeHostedLevel; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const choice = autopilotChoiceOf(autopilot, level);

  const apply = (event: LevelPickEvent) => {
    const before = current.current.saved;
    const { state, send } = levelPickStep(current.current, event);
    current.current = state;
    setPicking(state);
    if (send) save(send, before);
  };
  const save = (next: ContributeHostedLevel, before: ContributeHostedLevel) => {
    setSaving(next);
    setError(null);
    startTransition(async () => {
      const result = await saveContributeSettings({ hostedLevel: next }).catch(() => null);
      setSaving(null);
      if (result?.ok) {
        router.refresh();
        return;
      }
      apply({ kind: 'refused', before });
      setError({ level: next, text: autopilotErrorMessage(result?.error ?? 'FAILED', result?.message) });
    });
  };
  // A level saved elsewhere (another tab) arrives with the page's next read.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new read of the level resets the control.
  useEffect(() => apply({ kind: 'read', level }), [level]);
  const pick = useSettledPick((next: ContributeHostedLevel) => apply({ kind: 'settled', level: next }));
  const chosen = picking.shown;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5"
      data-hosted-level={level}
    >
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-title`} className={HEADING.card}>
          How much it does by itself
        </h3>
        <p className="text-sm text-muted-foreground">Each level includes the one before it.</p>
      </div>
      <RadioGroup
        aria-labelledby={`${id}-title`}
        value={chosen}
        onValueChange={(next) => {
          apply({ kind: 'shown', level: next as ContributeHostedLevel });
          pick(next as ContributeHostedLevel);
        }}
        className="gap-2"
      >
        {HOSTED_LEVELS.map(({ level: card, title, text }) => {
          const selected = chosen === card;
          const isAutopilot = card === 'AUTOPILOT';
          const disabled = isAutopilot && !choice.canChoose && level !== 'AUTOPILOT';
          return (
            <div
              key={card}
              id={isAutopilot ? 'autopilot' : undefined}
              data-level-card={card}
              {...(isAutopilot
                ? {
                    'data-autopilot': autopilot.unlocked ? 'unlocked' : 'locked',
                    'data-autopilot-available':
                      autopilot.available === undefined ? 'unknown' : String(autopilot.available),
                  }
                : {})}
              className={cn(
                'flex scroll-mt-20 flex-col gap-1 rounded-lg border p-3.5 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                selected && 'border-primary bg-brand-soft/40',
              )}
            >
              <label
                htmlFor={`${id}-${card}`}
                className={cn('flex items-start gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
              >
                <RadioGroupItem id={`${id}-${card}`} value={card} disabled={disabled} className="mt-0.5" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      'flex flex-wrap items-center gap-2 font-semibold',
                      disabled && 'text-muted-foreground',
                    )}
                  >
                    {title}
                    {isAutopilot && choice.pill ? (
                      <Pill tone="violet">
                        <Lock aria-hidden="true" />
                        {choice.pill}
                      </Pill>
                    ) : null}
                    {saving === card ? (
                      <span role="status" className="text-xs font-normal text-muted-foreground">
                        Saving…
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">{text}</span>
                </span>
              </label>
              <div className="flex flex-col gap-1 pl-7 empty:hidden">
                {isAutopilot ? <AutopilotHowLink autopilot={autopilot} login={login} /> : null}
                {isAutopilot && choice.noEmail ? (
                  <span data-autopilot-no-email className="text-warning">
                    {level === 'AUTOPILOT' ? AUTOPILOT_NO_EMAIL_ON : AUTOPILOT_NO_EMAIL}
                  </span>
                ) : null}
                {isAutopilot && selected && choice.lockedAfterChosen ? (
                  <span data-autopilot-relocked className="text-warning">
                    Paused: {AUTOPILOT_LOCK_AT} pull requests were closed without merging. Until {AUTOPILOT_UNLOCK_AT}{' '}
                    more are merged it works as the level above.
                  </span>
                ) : null}
                {isAutopilot && selected && autopilot.noticeTo ? (
                  <span data-autopilot-notice-to className="text-muted-foreground">
                    Emails before each submission go to {autopilot.noticeTo}
                  </span>
                ) : null}
                {selected && card !== 'MANUAL' && nextIssue ? (
                  <span data-next-issue className="text-muted-foreground">
                    {nextIssue}
                  </span>
                ) : null}
                {error?.level === card ? (
                  <span role="alert" className="text-destructive">
                    {error.text}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </RadioGroup>
      <AutopilotConfirm
        autopilot={autopilot}
        login={login}
        open={picking.confirming}
        onOpenChange={(open) => {
          if (!open) apply({ kind: 'cancel' });
        }}
        onConfirm={() => apply({ kind: 'confirm' })}
      />
    </section>
  );
}
