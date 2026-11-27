'use client';

import { Layers } from 'lucide-react';
import { useId, useRef, useState, useTransition } from 'react';

import { SettingsRow } from '@/components/workspace/settings-rows';
import type { BuildActionResult } from '@/lib/build/build-action';
import { BUILD_SETTINGS_SAVE_MINE_PATH } from '@/lib/build/paths';
import {
  BUILD_REMINDERS_LINE,
  BUILD_REMINDERS_TITLE,
  buildSettingsErrorOf,
  buildSettingsOf,
} from '@/lib/build/settings';
import type { BuildSettings } from '@/lib/build/types';
import { EMAIL_NO_ADDRESS } from '@/lib/workspace/email-settings';

/** Saves the reminders through Build's route: the settings as saved, or why not. */
async function saveReminders(reminders: boolean): Promise<BuildActionResult<BuildSettings>> {
  try {
    const res = await fetch(BUILD_SETTINGS_SAVE_MINE_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reminders }),
      cache: 'no-store',
    });
    const answer = (await res.json().catch(() => null)) as BuildActionResult<unknown> | null;
    if (answer?.ok) {
      const saved = buildSettingsOf(answer.data);
      return saved ? { ok: true, data: saved } : { ok: false, error: 'FAILED' };
    }
    return { ok: false, error: answer && !answer.ok ? answer.error : 'FAILED' };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

/**
 * "Build reminders": one switch for Build's two emails (the gold test is open, a build stands still), for a person with
 * a build. It changes in place and saves at once; a save that fails moves it back and says why. With no address the
 * line says no email is sent; a switch that is on can still be turned off then, one that is off cannot be turned on.
 */
export function BuildRemindersRow({ on: initial, noAddress = false }: { on: boolean; noAddress?: boolean }) {
  const id = useId();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saved = useRef(initial);
  // Set at once, before the transition's pending state renders, so a quick second change is ignored too.
  const saving = useRef(false);

  const change = (next: boolean) => {
    if (saving.current) return;
    saving.current = true;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await saveReminders(next);
      saving.current = false;
      if (!result.ok) {
        setOn(saved.current);
        setError(buildSettingsErrorOf(result.error));
        return;
      }
      saved.current = result.data.reminders;
      setOn(result.data.reminders);
    });
  };

  return (
    <SettingsRow
      icon={Layers}
      title={BUILD_REMINDERS_TITLE}
      value={
        <>
          <span id={`${id}-line`} className="block text-pretty">
            {noAddress ? EMAIL_NO_ADDRESS : BUILD_REMINDERS_LINE}
          </span>
          {error ? (
            <span role="alert" className="mt-1 block font-medium text-destructive">
              {error}
            </span>
          ) : null}
        </>
      }
      data={{
        'data-email-row': 'build-reminders',
        'data-build-reminders': on ? 'on' : 'off',
        ...(noAddress ? { 'data-email-no-address': '' } : {}),
      }}
    >
      <label htmlFor={`${id}-switch`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-0">
        <input
          id={`${id}-switch`}
          type="checkbox"
          // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox: the switch role reads its checked state, so aria-checked would only repeat it.
          role="switch"
          aria-label={`Email ${BUILD_REMINDERS_TITLE.toLowerCase()}`}
          aria-describedby={`${id}-line`}
          aria-disabled={pending || undefined}
          checked={on}
          disabled={noAddress && !on}
          onChange={(event) => change(event.target.checked)}
          className="size-4.5 accent-primary disabled:opacity-60 aria-disabled:opacity-60"
        />
        {/* "On" and "Off" take the same width, so nothing moves when it changes. */}
        <span className="inline-block w-6">{on ? 'On' : 'Off'}</span>
      </label>
    </SettingsRow>
  );
}
