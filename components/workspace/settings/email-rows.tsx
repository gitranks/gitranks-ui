'use client';

import { Bell, SquareCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { SegmentedRadios, useSettledPick } from '@/components/workspace/settings/radio-pills';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { setContributeEmailSettings } from '@/lib/workspace/actions';
import type { ContributeEmailSettings, ContributeNeedsYouEmail } from '@/lib/workspace/contribute.types';
import {
  addressLineOf,
  browserTimeZone,
  EMAIL_AUTOPILOT_NOTE,
  EMAIL_NO_ADDRESS,
  EMAIL_READ_FAILED,
  ENDED_TITLE,
  endedLineOf,
  hintQuestionOf,
  keepLabelOf,
  NEEDS_YOU_LABELS,
  NEEDS_YOU_TITLE,
  needsYouLineOf,
  rememberSentTimeZone,
  withoutEmailHint,
} from '@/lib/workspace/email-settings';
import { contributeErrorMessage } from '@/lib/workspace/errors';

const CHOICES = (Object.keys(NEEDS_YOU_LABELS) as ContributeNeedsYouEmail[]).map((value) => ({
  value,
  label: NEEDS_YOU_LABELS[value],
}));

const noSubscribe = () => () => {};

/** Takes the email's switch hint out of the address, so a reload or a shared link does not ask again. */
const dropHintFromAddress = () => window.history.replaceState(null, '', withoutEmailHint(window.location.href));

type Patch = { needsYou?: ContributeNeedsYouEmail; ended?: boolean };

/**
 * Settings' Email group (`#email`): when a pull request needs the user (Immediately, Once a day, Off) and when one is
 * merged or closed, for Contribute and Learn alike, with Learn's own rows where Learn is open (`lead` before these,
 * `tail` after: the product the page was opened from comes first, the Time zone row last). A change saves at once with
 * the browser's time zone: the control moves, and moves back with why when the save fails; a change while one saves is
 * ignored. With no address both controls are disabled under why. Opened from an email's "instead" link (`hint`), it
 * asks before switching. `settings` undefined: the read failed, and the group says so under the other rows; null:
 * the API hides these rows, and the group holds the others alone.
 */
export function EmailRows({
  settings,
  autopilotOn = false,
  hint = null,
  lead = null,
  tail = null,
  zoneRow = false,
}: {
  settings: ContributeEmailSettings | null | undefined;
  /** Autopilot's notices still come: said while it is on. */
  autopilotOn?: boolean;
  /** The choice an email's link offers. */
  hint?: ContributeNeedsYouEmail | null;
  /** Rows before these, in the same list. */
  lead?: ReactNode;
  /** Rows after these, in the same list. */
  tail?: ReactNode;
  /** A "Time zone" row says the zone: the summary's line leaves it out. */
  zoneRow?: boolean;
}) {
  return (
    <SettingsGroup id="email" title="Email">
      {settings ? (
        <Rows settings={settings} autopilotOn={autopilotOn} hint={hint} lead={lead} tail={tail} zoneRow={zoneRow} />
      ) : (
        <>
          {lead || tail ? (
            <SettingsList>
              {lead}
              {tail}
            </SettingsList>
          ) : null}
          {settings === undefined ? <ReadFailed /> : null}
        </>
      )}
    </SettingsGroup>
  );
}

function ReadFailed() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 text-sm"
      data-email="failed"
    >
      <span className="text-muted-foreground">{EMAIL_READ_FAILED}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className="max-sm:min-h-11"
        onClick={() => startTransition(() => router.refresh())}
      >
        Try again
      </Button>
    </div>
  );
}

function Rows({
  settings,
  autopilotOn,
  hint,
  lead,
  tail,
  zoneRow,
}: {
  settings: ContributeEmailSettings;
  autopilotOn: boolean;
  hint: ContributeNeedsYouEmail | null;
  lead: ReactNode;
  tail: ReactNode;
  zoneRow: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [shown, setShown] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(hint !== null);
  const [pending, startTransition] = useTransition();
  // The last values the API holds: what a failed save moves back to.
  const saved = useRef(settings);
  // Set at once, before the transition's pending state renders, so a quick second change is ignored too.
  const saving = useRef(false);
  // The summary's time zone: the one stored, else the one this browser would send (known only once in the browser).
  const browserZone = useSyncExternalStore(noSubscribe, browserTimeZone, () => null);
  // A zone saved from the Time zone row comes back in a new read of the page: the summary's line follows it.
  useEffect(() => {
    saved.current = { ...saved.current, timeZone: settings.timeZone };
    setShown((now) => ({ ...now, timeZone: settings.timeZone }));
  }, [settings.timeZone]);

  const save = (given: Patch, onSaved?: () => void) => {
    if (saving.current) return;
    saving.current = true;
    // A choice picked just before, still waiting to be saved, goes in this same save (one save at a time), unless
    // this save sets the choice itself.
    const waiting = pickNeedsYou.cancel();
    const patch: Patch = { ...(waiting ? { needsYou: waiting.value } : {}), ...given };
    setShown((now) => ({ ...now, ...patch }));
    setError(null);
    const zone = browserTimeZone();
    startTransition(async () => {
      const result = await setContributeEmailSettings({ ...patch, ...(zone ? { timeZone: zone } : {}) }).catch(
        () => null,
      );
      saving.current = false;
      if (!result?.ok) {
        setShown(saved.current);
        setError(result ? contributeErrorMessage(result.error, result.message) : contributeErrorMessage('FAILED'));
        return;
      }
      saved.current = result.data;
      setShown(result.data);
      if (zone) rememberSentTimeZone(zone);
      onSaved?.();
      router.refresh();
    });
  };
  // Arrowing through the choices picks each in turn: the control moves at once, the last pick is saved.
  const pickNeedsYou = useSettledPick((needsYou: ContributeNeedsYouEmail) => save({ needsYou }));

  const noAddress = !shown.to;
  const hinted = hintOpen && hint !== null && !noAddress && shown.needsYou !== hint ? hint : null;
  const closeHint = () => {
    setHintOpen(false);
    dropHintFromAddress();
  };

  return (
    <>
      {hinted ? (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/40 bg-brand-soft px-4 py-3 text-sm"
          data-email-hint={hinted}
        >
          <span className="font-medium text-brand-soft-foreground">{hintQuestionOf(hinted)}</span>
          <span className="ml-auto flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              className="max-sm:min-h-11"
              onClick={() => save({ needsYou: hinted }, closeHint)}
            >
              Switch
            </Button>
            <button
              type="button"
              onClick={closeHint}
              className="rounded px-1 text-sm font-semibold text-link hover:underline max-sm:min-h-11"
            >
              {keepLabelOf(shown.needsYou)}
            </button>
          </span>
        </div>
      ) : null}
      <SettingsList>
        {lead}
        <SettingsRow
          icon={Bell}
          title={NEEDS_YOU_TITLE}
          value={
            <span id={`${id}-needs-you`} className="block text-pretty">
              {needsYouLineOf(shown.needsYou, zoneRow ? null : (shown.timeZone ?? browserZone ?? 'UTC'))}
            </span>
          }
          data={{ 'data-email-row': 'needs-you', 'data-email-needs-you': shown.needsYou }}
        >
          <SegmentedRadios
            legend={NEEDS_YOU_TITLE}
            options={CHOICES}
            value={shown.needsYou}
            disabled={noAddress}
            describedBy={`${id}-needs-you`}
            onChange={(needsYou) => {
              if (saving.current) return;
              setShown((now) => ({ ...now, needsYou }));
              pickNeedsYou(needsYou);
            }}
          />
        </SettingsRow>
        <SettingsRow
          icon={SquareCheck}
          title={ENDED_TITLE}
          value={<span id={`${id}-ended`}>{endedLineOf(shown.ended)}</span>}
          data={{ 'data-email-row': 'ended', 'data-email-ended': shown.ended ? 'on' : 'off' }}
        >
          <label
            htmlFor={`${id}-ended-switch`}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-0"
          >
            <input
              id={`${id}-ended-switch`}
              type="checkbox"
              // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox: the switch role reads its checked state, so aria-checked would only repeat it.
              role="switch"
              aria-label={`Email ${ENDED_TITLE.toLowerCase()}`}
              aria-describedby={`${id}-ended`}
              aria-disabled={pending || undefined}
              checked={shown.ended}
              disabled={noAddress}
              onChange={(event) => save({ ended: event.target.checked })}
              className="size-4.5 accent-primary disabled:opacity-60 aria-disabled:opacity-60"
            />
            {/* "On" and "Off" take the same width, so nothing moves when it changes. */}
            <span className="inline-block w-6">{shown.ended ? 'On' : 'Off'}</span>
          </label>
        </SettingsRow>
        {tail}
      </SettingsList>
      {error ? (
        <p role="alert" className="px-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="px-1 text-sm text-muted-foreground" data-email-to={noAddress ? 'none' : 'known'}>
        {noAddress
          ? EMAIL_NO_ADDRESS
          : [addressLineOf(shown.to as string), autopilotOn ? EMAIL_AUTOPILOT_NOTE : null].filter(Boolean).join(' ')}
      </p>
    </>
  );
}
