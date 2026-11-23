'use client';

import { Check, ChevronsUpDown, Clock, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useId, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SettingsRow } from '@/components/workspace/settings-rows';
import {
  allZonesOf,
  DEVICE_ZONE_NOT_SAVED,
  LEARN_EMAIL_READ_FAILED,
  LESSONS_TO_REPEAT_LINE,
  LESSONS_TO_REPEAT_TITLE,
  type LearnEmailSettings,
  type LearnEmailSettingsInput,
  learnSettingsErrorOf,
  pickChangesNothing,
  settingsAfterPick,
  TIME_ZONE_TITLE,
  timeZoneLineOf,
  type ZoneChoice,
  zoneChoicesOf,
  zoneLabelOf,
  zonePickInputOf,
  zoneSourceOf,
} from '@/lib/learn/settings';
import { saveLearnEmailSettingsAction } from '@/lib/learn/settings.actions';
import { setContributeEmailSettings } from '@/lib/workspace/actions';
import { browserTimeZone, forgetSentTimeZone, rememberSentTimeZone } from '@/lib/workspace/email-settings';

/*
 * Learn's two rows of Settings' Email group (page 23): "Lessons to repeat" and "Time zone". Each change saves at once
 * and sends only its own field, so the switch never moves the zone and a zone never moves the switch. A save that
 * fails moves the row back and says why; a change while one saves is ignored.
 */

const noSubscribe = () => () => {};

type Saved = { ok: true; data: LearnEmailSettings } | { ok: false; error: string };

/** Saves from a row: the new settings, or the words of why they were not saved. */
async function saveLearnEmail(input: LearnEmailSettingsInput): Promise<Saved> {
  const result = await saveLearnEmailSettingsAction(input).catch(() => null);
  if (!result) return { ok: false, error: learnSettingsErrorOf('FAILED') };
  if (!result.ok) return { ok: false, error: learnSettingsErrorOf(result.error) };
  if (!result.data) return { ok: false, error: learnSettingsErrorOf('CLOSED') };
  return { ok: true, data: result.data };
}

/**
 * Sends the device's zone as the device's, kept by the Email rows and the morning emails: the zone kept, or null when
 * the save failed. A failed save forgets the zone as sent, so the next visit sends it again (`TimeZoneNote`).
 */
async function sendDeviceZone(zone: string): Promise<{ kept: string | null } | null> {
  const sent = await setContributeEmailSettings({ timeZone: zone }).catch(() => null);
  if (!sent?.ok) {
    forgetSentTimeZone();
    return null;
  }
  rememberSentTimeZone(zone);
  return { kept: sent.data.timeZone };
}

/** A row's line, and why its last change did not save under it. */
function RowValue({
  id,
  line,
  error,
  retry,
}: {
  id: string;
  line: ReactNode;
  error: string | null;
  /** A second save that failed after the row's own: what did not save, and a button to send it again. */
  retry?: { line: string; onRetry: () => void; pending: boolean };
}) {
  return (
    <>
      <span id={id} className="block text-pretty">
        {line}
      </span>
      {error ? (
        <span role="alert" className="mt-1 block font-medium text-destructive">
          {error}
        </span>
      ) : null}
      {retry ? (
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1" data-time-zone-unsaved="">
          <span role="alert" className="font-medium text-destructive">
            {retry.line}
          </span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 max-sm:min-h-11"
            aria-disabled={retry.pending || undefined}
            onClick={retry.onRetry}
          >
            Try again
          </Button>
        </span>
      ) : null}
    </>
  );
}

/** In place of Learn's two rows when their read failed: the rest of the group works as usual. */
export function LearnEmailFailedRow() {
  return (
    <li className="px-4 py-3.5 text-sm text-muted-foreground" data-email-row="learn-failed">
      {LEARN_EMAIL_READ_FAILED}
    </li>
  );
}

/**
 * "Lessons to repeat": a switch, off until the person turns it on. With no address it is disabled, as the Email rows
 * are (`noAddress`).
 */
export function LessonsToRepeatRow({ on: initial, noAddress = false }: { on: boolean; noAddress?: boolean }) {
  const router = useRouter();
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
      const result = await saveLearnEmail({ lessonsToRepeat: next });
      saving.current = false;
      if (!result.ok) {
        setOn(saved.current);
        setError(result.error);
        return;
      }
      saved.current = result.data.lessonsToRepeat;
      setOn(result.data.lessonsToRepeat);
      router.refresh();
    });
  };

  return (
    <SettingsRow
      icon={Repeat}
      title={LESSONS_TO_REPEAT_TITLE}
      value={<RowValue id={`${id}-line`} line={LESSONS_TO_REPEAT_LINE} error={error} />}
      data={{ 'data-email-row': 'lessons-to-repeat', 'data-email-lessons': on ? 'on' : 'off' }}
    >
      <label htmlFor={`${id}-switch`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-0">
        <input
          id={`${id}-switch`}
          type="checkbox"
          // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox: the switch role reads its checked state, so aria-checked would only repeat it.
          role="switch"
          aria-label={`Email ${LESSONS_TO_REPEAT_TITLE.toLowerCase()}`}
          aria-describedby={`${id}-line`}
          aria-disabled={pending || undefined}
          checked={on}
          disabled={noAddress}
          onChange={(event) => change(event.target.checked)}
          className="size-4.5 accent-primary disabled:opacity-60 aria-disabled:opacity-60"
        />
        {/* "On" and "Off" take the same width, so nothing moves when it changes. */}
        <span className="inline-block w-6">{on ? 'On' : 'Off'}</span>
      </label>
    </SettingsRow>
  );
}

/**
 * "Time zone": the zone the morning emails keep, said in a line (taken from the device, chosen by the person, or not
 * known and New York's), and a button that opens a searchable list of cities, the device's first and marked. A pick
 * saves at once: the device's own zone hands the choice back to the device, and is then sent as the device's, since
 * the zone kept until then is the one chosen before; any other zone is the person's from now on. `savedZone`: the
 * zone the Email rows read, null for none, undefined when they did not load.
 */
export function TimeZoneRow({
  settings: initial,
  savedZone,
}: {
  settings: LearnEmailSettings;
  savedZone: string | null | undefined;
}) {
  const router = useRouter();
  const id = useId();
  const [settings, setSettings] = useState(initial);
  const [known, setKnown] = useState(savedZone);
  const [error, setError] = useState<string | null>(null);
  // The setting follows the device, but the device's zone did not save: the line names no source, and a retry shows.
  const [deviceUnsaved, setDeviceUnsaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const saved = useRef<{ settings: LearnEmailSettings; known: string | null | undefined }>({
    settings: initial,
    known: savedZone,
  });
  const saving = useRef(false);
  // The device's zone is known only in the browser: none on the server's render.
  const deviceZone = useSyncExternalStore(noSubscribe, browserTimeZone, () => null);
  const label = zoneLabelOf(settings.timeZone, new Date());
  // Some 400 zones, labelled only while the list is open.
  const choices = useMemo(
    () => (open ? zoneChoicesOf(allZonesOf(deviceZone, settings.timeZone), deviceZone, new Date()) : []),
    [open, deviceZone, settings.timeZone],
  );

  /** The settings and the zone kept, once saved: shown, and what a failed save goes back to. */
  const settle = (next: LearnEmailSettings, nextKnown: string | null | undefined) => {
    saving.current = false;
    saved.current = { settings: next, known: nextKnown };
    setSettings(next);
    setKnown(nextKnown);
    router.refresh();
  };

  /** The device's zone sent once the setting follows the device: a failure says so on the row and offers to retry. */
  const sendDevice = async (next: LearnEmailSettings, zone: string) => {
    const sent = await sendDeviceZone(zone);
    setDeviceUnsaved(!sent);
    if (!sent) settle(next, saved.current.known);
    else settle({ ...next, timeZone: sent.kept ?? next.timeZone }, sent.kept);
  };

  const pick = (zone: string) => {
    setOpen(false);
    if (saving.current) return;
    if (pickChangesNothing(settings, known, zone, deviceZone)) return;
    const input = zonePickInputOf(zone, deviceZone);
    saving.current = true;
    setSettings(settingsAfterPick(settings, input, deviceZone));
    if (input.timeZoneBy === 'DEVICE') setKnown(deviceZone);
    setError(null);
    setDeviceUnsaved(false);
    startTransition(async () => {
      const result = await saveLearnEmail(input);
      if (!result.ok) {
        saving.current = false;
        setSettings(saved.current.settings);
        setKnown(saved.current.known);
        setError(result.error);
        return;
      }
      if (input.timeZoneBy === 'DEVICE' && deviceZone) await sendDevice(result.data, deviceZone);
      else settle(result.data, saved.current.known);
    });
  };

  const retry = () => {
    if (saving.current || !deviceZone) return;
    saving.current = true;
    startTransition(() => sendDevice(saved.current.settings, deviceZone));
  };

  return (
    <SettingsRow
      icon={Clock}
      title={TIME_ZONE_TITLE}
      value={
        <RowValue
          id={`${id}-line`}
          line={timeZoneLineOf(settings.timeZone, deviceUnsaved ? null : zoneSourceOf(settings, known))}
          error={error}
          retry={deviceUnsaved ? { line: DEVICE_ZONE_NOT_SAVED, onRetry: retry, pending } : undefined}
        />
      }
      data={{ 'data-email-row': 'time-zone', 'data-time-zone-by': settings.timeZoneBy.toLowerCase() }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`${TIME_ZONE_TITLE}: ${label}`}
            aria-describedby={`${id}-line`}
            aria-disabled={pending || undefined}
            className="max-sm:min-h-11"
            data-time-zone={settings.timeZone}
          >
            {label}
            <ChevronsUpDown aria-hidden="true" className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <ZoneChoices choices={choices} selected={settings.timeZone} onPick={pick} />
        </PopoverContent>
      </Popover>
    </SettingsRow>
  );
}

/**
 * The time zone's list: a search, and the cities with their offsets, the device's first and marked, the one in use
 * checked. Picking one calls `onPick` with its zone.
 */
export function ZoneChoices({
  choices,
  selected,
  onPick,
}: {
  choices: readonly ZoneChoice[];
  selected: string;
  onPick: (zone: string) => void;
}) {
  const inBrowser = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  return (
    // Search the cities and the zones' names, not the values that keep items apart.
    <Command
      filter={(_, search, keywords) =>
        keywords?.join(' ').toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0
      }
    >
      <CommandInput placeholder="Search a city" aria-label="Search a city" />
      <CommandList>
        {/* Counted once the list is in the browser: the server's render would say none before the items count. */}
        {inBrowser ? <CommandEmpty>No city found.</CommandEmpty> : null}
        {choices.map((choice) => (
          <CommandItem
            key={choice.zone}
            value={choice.zone}
            keywords={[choice.label, choice.zone.replace(/_/g, ' ')]}
            onSelect={() => onPick(choice.zone)}
            data-zone={choice.zone}
          >
            <span className="truncate">
              {choice.label}
              {choice.device ? <span className="text-muted-foreground"> · from your device</span> : null}
            </span>
            {choice.zone === selected ? <Check className="ml-auto" aria-label="Selected" /> : null}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
