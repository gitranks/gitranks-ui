'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useId, useState, useTransition } from 'react';

import { saveContributeSettings } from '../actions';
import { Panel, PanelTitle } from './primitives';
import { Button } from '@/components/ui/button';
import type {
  ContributeDcoMode,
  ContributeEffort,
  ContributeModel,
  ContributePace,
  ContributeSettings,
  ContributeSettingsInput,
} from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { EFFORTS, MODELS, ordinalDay, PACES, parseAmount } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

/** Above these, one line says that large pull requests are merged less often. */
const DEFAULT_MAX_LINES = 400;
const DEFAULT_MAX_FILES = 15;

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
const selectClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground';

type Draft = Record<
  | 'cycleCapUsd'
  | 'weekCapUsd'
  | 'dayCapUsd'
  | 'attemptCapUsd'
  | 'attemptsAtATime'
  | 'sweepDays'
  | 'maxChangedLines'
  | 'maxFiles'
  | 'openPrsAtATime',
  string
> & {
  pace: ContributePace;
  renewalDay: number;
  mainModel: ContributeModel;
  helperModel: ContributeModel;
  testModel: ContributeModel | null;
  effort: ContributeEffort;
  dco: ContributeDcoMode;
};

const money = (value: number | null) => (value === null ? '' : `$${value}`);

const draftOf = (settings: ContributeSettings): Draft => ({
  cycleCapUsd: money(settings.cycleCapUsd),
  weekCapUsd: money(settings.weekCapUsd),
  dayCapUsd: money(settings.dayCapUsd),
  attemptCapUsd: money(settings.attemptCapUsd),
  attemptsAtATime: String(settings.attemptsAtATime),
  sweepDays: String(settings.sweepDays),
  maxChangedLines: String(settings.maxChangedLines),
  maxFiles: String(settings.maxFiles),
  openPrsAtATime: String(settings.openPrsAtATime),
  pace: settings.pace,
  renewalDay: settings.renewalDay,
  mainModel: settings.mainModel,
  helperModel: settings.helperModel,
  testModel: settings.testModel,
  effort: settings.effort,
  dco: settings.dco,
});

type Section = 'limits' | 'pacing' | 'agent' | 'prs';

/** Each section's patch from the draft, or the label of the first field that is not a valid number. */
export function patchOf(section: Section, draft: Draft): { patch: ContributeSettingsInput } | { invalid: string } {
  const required = (label: string, text: string, integer = false) => {
    const value = parseAmount(text);
    if (value === null || value === undefined || (integer && !Number.isInteger(value))) throw label;
    return value;
  };
  const optional = (label: string, text: string) => {
    const value = parseAmount(text);
    if (value === undefined) throw label;
    return value;
  };
  try {
    switch (section) {
      case 'limits':
        return {
          patch: {
            cycleCapUsd: required('Each billing cycle', draft.cycleCapUsd),
            weekCapUsd: optional('Each week', draft.weekCapUsd),
            dayCapUsd: optional('Each day', draft.dayCapUsd),
            attemptCapUsd: required('Each attempt', draft.attemptCapUsd),
            attemptsAtATime: required('Attempts at a time', draft.attemptsAtATime, true),
          },
        };
      case 'pacing':
        return {
          patch: {
            pace: draft.pace,
            sweepDays: required('Sweep days', draft.sweepDays, true),
            renewalDay: draft.renewalDay,
          },
        };
      case 'agent':
        return {
          patch: {
            mainModel: draft.mainModel,
            helperModel: draft.helperModel,
            testModel: draft.testModel,
            effort: draft.effort,
          },
        };
      case 'prs':
        return {
          patch: {
            maxChangedLines: required('Changed lines', draft.maxChangedLines, true),
            maxFiles: required('Files', draft.maxFiles, true),
            openPrsAtATime: required('Open PRs at a time', draft.openPrsAtATime, true),
            dco: draft.dco,
          },
        };
    }
  } catch (label) {
    return { invalid: String(label) };
  }
}

function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveRow({ onSave, pending, message }: { onSave: () => void; pending: boolean; message?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onSave}
        disabled={pending}
        className="px-4 font-semibold"
      >
        {pending ? 'Saving…' : 'Save'}
      </Button>
      {message}
    </div>
  );
}

/** The spending limits, pacing, the agent and pull requests, each section saved on its own. */
export function SettingsForm({ settings }: { settings: ContributeSettings }) {
  const router = useRouter();
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => draftOf(settings));
  const [status, setStatus] = useState<{ section: Section; ok: boolean; text: string } | null>(null);
  const [pendingSection, setPendingSection] = useState<Section | null>(null);
  const [, startTransition] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = (section: Section) => {
    const built = patchOf(section, draft);
    if ('invalid' in built) {
      setStatus({ section, ok: false, text: `${built.invalid}: enter a number.` });
      return;
    }
    setPendingSection(section);
    startTransition(async () => {
      const result = await saveContributeSettings(built.patch);
      setPendingSection(null);
      if (result.ok) {
        setDraft(draftOf(result.data));
        setStatus({ section, ok: true, text: 'Saved.' });
        router.refresh();
      } else {
        setStatus({ section, ok: false, text: contributeErrorMessage(result.error, result.message) });
      }
    });
  };

  const messageFor = (section: Section) =>
    status?.section === section ? (
      <span
        role={status.ok ? 'status' : 'alert'}
        className={cn('text-sm', status.ok ? 'text-positive' : 'text-destructive')}
      >
        {status.text}
      </span>
    ) : null;

  const field = (key: keyof Draft) => `${id}-${key}`;
  const textInput = (key: keyof Draft, placeholder?: string) => (
    <input
      id={field(key)}
      inputMode="decimal"
      value={draft[key] as string}
      placeholder={placeholder}
      onChange={(event) => set(key, event.target.value as never)}
      className={inputClass}
    />
  );

  const lines = Number(draft.maxChangedLines);
  const files = Number(draft.maxFiles);
  const large = lines > DEFAULT_MAX_LINES || files > DEFAULT_MAX_FILES;

  return (
    <>
      <Panel id="limits">
        <PanelTitle
          title="Spending limits"
          text="We never start an attempt that could cross one of these. Leave a field empty for no limit."
        />
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Each billing cycle" htmlFor={field('cycleCapUsd')}>
            {textInput('cycleCapUsd')}
          </Field>
          <Field label="Each week" htmlFor={field('weekCapUsd')}>
            {textInput('weekCapUsd', 'No limit')}
          </Field>
          <Field label="Each day" htmlFor={field('dayCapUsd')}>
            {textInput('dayCapUsd', 'No limit')}
          </Field>
          <Field label="Each attempt" htmlFor={field('attemptCapUsd')}>
            {textInput('attemptCapUsd')}
          </Field>
          <Field label="Attempts at a time" htmlFor={field('attemptsAtATime')}>
            {textInput('attemptsAtATime')}
          </Field>
        </div>
        <span className="text-sm text-muted-foreground">
          Amounts are at list price, the unit your credits are counted in. A no-go check uses at most a tenth of the
          attempt limit before the agent decides whether to go on.
        </span>
        <SaveRow onSave={() => save('limits')} pending={pendingSection === 'limits'} message={messageFor('limits')} />
      </Panel>

      <Panel id="pacing">
        <PanelTitle title="Pacing" text="Your credits expire when they renew. Choose how we spread the work." />
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Pacing mode</legend>
          {(Object.keys(PACES) as ContributePace[]).map((pace) => (
            <label
              key={pace}
              htmlFor={`${field('pace')}-${pace}`}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3',
                draft.pace === pace && 'border-primary bg-brand-soft/50 ring-1 ring-primary',
              )}
            >
              <input
                id={`${field('pace')}-${pace}`}
                type="radio"
                name={field('pace')}
                checked={draft.pace === pace}
                onChange={() => set('pace', pace)}
                className="mt-1 accent-primary"
              />
              <span className="flex flex-col">
                <span className="font-medium">{PACES[pace].title}</span>
                <span className="text-sm text-muted-foreground">{PACES[pace].text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Sweep days" htmlFor={field('sweepDays')}>
            {textInput('sweepDays')}
          </Field>
          <Field label="Credits renew on" htmlFor={field('renewalDay')}>
            <select
              id={field('renewalDay')}
              value={draft.renewalDay}
              onChange={(event) => set('renewalDay', Number(event.target.value))}
              className={selectClass}
            >
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {ordinalDay(day)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <SaveRow onSave={() => save('pacing')} pending={pendingSection === 'pacing'} message={messageFor('pacing')} />
      </Panel>

      <Panel id="agent">
        <PanelTitle title="The agent" text="Bigger models fix harder issues and cost more per attempt." />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Main model" htmlFor={field('mainModel')}>
            <select
              id={field('mainModel')}
              value={draft.mainModel}
              onChange={(event) => set('mainModel', event.target.value as ContributeModel)}
              className={selectClass}
            >
              {(Object.keys(MODELS) as ContributeModel[]).map((model) => (
                <option key={model} value={model}>
                  {MODELS[model]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Running tests and reading logs" htmlFor={field('helperModel')}>
            <select
              id={field('helperModel')}
              value={draft.helperModel}
              onChange={(event) => set('helperModel', event.target.value as ContributeModel)}
              className={selectClass}
            >
              {(Object.keys(MODELS) as ContributeModel[]).map((model) => (
                <option key={model} value={model}>
                  {MODELS[model]}
                  {model === 'CLAUDE_HAIKU_5_5' ? ' (cheaper)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Writing tests" htmlFor={field('testModel')}>
            <select
              id={field('testModel')}
              value={draft.testModel ?? ''}
              onChange={(event) => set('testModel', (event.target.value || null) as ContributeModel | null)}
              className={selectClass}
            >
              <option value="">Same as the main model</option>
              {(Object.keys(MODELS) as ContributeModel[]).map((model) => (
                <option key={model} value={model}>
                  {MODELS[model]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Effort" htmlFor={field('effort')}>
            <select
              id={field('effort')}
              value={draft.effort}
              onChange={(event) => set('effort', event.target.value as ContributeEffort)}
              className={selectClass}
            >
              {(Object.keys(EFFORTS) as ContributeEffort[]).map((effort) => (
                <option key={effort} value={effort}>
                  {EFFORTS[effort]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <SaveRow onSave={() => save('agent')} pending={pendingSection === 'agent'} message={messageFor('agent')} />
      </Panel>

      <Panel id="prs">
        <PanelTitle title="Pull requests" text="An attempt above these limits stops before review." />
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Changed lines" htmlFor={field('maxChangedLines')}>
            {textInput('maxChangedLines')}
          </Field>
          <Field label="Files" htmlFor={field('maxFiles')}>
            {textInput('maxFiles')}
          </Field>
          <Field label="Open PRs at a time" htmlFor={field('openPrsAtATime')}>
            {textInput('openPrsAtATime')}
          </Field>
        </div>
        {large ? <span className="text-sm text-warning">Large pull requests are merged less often.</span> : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">DCO sign-off, for repos that require it</legend>
          {(
            [
              ['ASK', 'Ask me on every PR'],
              ['STANDING', 'Sign off for me on every PR, including autopilot'],
            ] as const
          ).map(([dco, label]) => (
            <label key={dco} htmlFor={`${field('dco')}-${dco}`} className="flex items-center gap-2.5 text-sm">
              <input
                id={`${field('dco')}-${dco}`}
                type="radio"
                name={field('dco')}
                checked={draft.dco === dco}
                onChange={() => set('dco', dco)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <SaveRow onSave={() => save('prs')} pending={pendingSection === 'prs'} message={messageFor('prs')} />
      </Panel>
    </>
  );
}
