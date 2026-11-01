'use client';

import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useState, useTransition } from 'react';

import { saveContributeSettings } from '../actions';
import { HEADING, Panel } from './primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const inputClass = 'h-auto rounded-lg py-2.5 font-mono md:text-base';
const selectClass = 'data-[size=default]:h-auto w-full rounded-lg py-2.5 text-base';
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

/** "Writing tests" takes no model of its own as this: Radix takes no empty value, and it is `null` in the draft. */
export const SAME_AS_MAIN = 'same';

export const helperModelLabelOf = (model: ContributeModel) =>
  `${MODELS[model]}${model === 'CLAUDE_HAIKU_5_5' ? ' (cheaper)' : ''}`;

export const testModelLabelOf = (model: ContributeModel | null) => (model ? MODELS[model] : 'Same as the main model');

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

export type SettingsSection = 'limits' | 'pacing' | 'agent' | 'prs';
type Section = SettingsSection;

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

/** A fold for the fields most people leave as they are: its title, their values in a line, and the fields. */
function Fold({
  id,
  anchor,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  /** Its id on the page, for links that name a field inside it. */
  anchor?: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div id={anchor} className="scroll-mt-20 rounded-xl border" data-fold={open ? 'open' : 'closed'}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">{summary}</span>
        </span>
      </button>
      {/* Kept on the page while folded, so the draft and the labels stay as they are. */}
      <div id={id} hidden={!open} className="flex flex-col gap-4 border-t px-4 pt-4 pb-4">
        {children}
      </div>
    </div>
  );
}

/** Each page's sections, saved together, and the fields its fold holds. */
const PAGES = {
  budget: {
    sections: ['limits', 'pacing'],
    folded: ['Each week', 'Each day', 'Each attempt', 'Attempts at a time', 'Sweep days'],
  },
  agent: { sections: ['agent', 'prs'], folded: [] },
} as const satisfies Record<string, { sections: SettingsSection[]; folded: string[] }>;

export type SettingsFormPage = keyof typeof PAGES;

/** One patch for a page's sections, or the label of the first field that is not a valid number. */
export type { Draft as SettingsDraft };

export function pagePatchOf(
  page: SettingsFormPage,
  draft: Draft,
): { patch: ContributeSettingsInput } | { invalid: string } {
  let patch: ContributeSettingsInput = {};
  for (const section of PAGES[page].sections) {
    const built = patchOf(section, draft);
    if ('invalid' in built) return built;
    patch = { ...patch, ...built.patch };
  }
  return { patch };
}

/** A cap as the fold's line says it: "$15 a day", "no week cap", or what was typed that is not a number. */
const capLabel = (text: string, what: string) => {
  const value = parseAmount(text);
  if (value === undefined) return `${what} cap “${text.trim()}”`;
  return value === null ? `no ${what} cap` : `$${value} ${what === 'attempt' ? 'an' : 'a'} ${what}`;
};

/** What the fold of More limits says of them, as typed. */
export const moreLimitsSummaryOf = (draft: Draft) =>
  [
    capLabel(draft.weekCapUsd, 'week'),
    capLabel(draft.dayCapUsd, 'day'),
    capLabel(draft.attemptCapUsd, 'attempt'),
    `${draft.attemptsAtATime.trim() || '?'} at a time`,
    `sweep ${draft.sweepDays.trim() === '1' ? '1 day' : `${draft.sweepDays.trim() || '?'} days`}`,
    `renews on ${ordinalDay(draft.renewalDay)}`,
  ].join(' · ');

/**
 * Budget and pacing, or the agent and pull requests, on their Settings page: what most people change up front, the
 * rest folded with its values shown, and one Save for the page.
 */
export function SettingsForm({ settings, page }: { settings: ContributeSettings; page: SettingsFormPage }) {
  const router = useRouter();
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => draftOf(settings));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [folded, setFolded] = useState(true);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  // A link to a folded field ("Attempts at a time in Settings") arrives with the fold open.
  useEffect(() => {
    if (window.location.hash === '#more-limits') setFolded(false);
  }, []);

  const save = () => {
    const built = pagePatchOf(page, draft);
    if ('invalid' in built) {
      // A field that is folded away opens, so the user sees what to fix.
      if ((PAGES[page].folded as readonly string[]).includes(built.invalid)) setFolded(false);
      setStatus({ ok: false, text: `${built.invalid}: enter a number.` });
      return;
    }
    startTransition(async () => {
      const result = await saveContributeSettings(built.patch);
      if (result.ok) {
        setDraft(draftOf(result.data));
        setStatus({ ok: true, text: 'Saved.' });
        router.refresh();
      } else {
        // The server may refuse a folded field (an attempt cap above a cap that is set): show it.
        if (result.error === 'INVALID') setFolded(false);
        setStatus({ ok: false, text: contributeErrorMessage(result.error, result.message) });
      }
    });
  };

  const field = (key: keyof Draft) => `${id}-${key}`;
  const textInput = (key: keyof Draft, placeholder?: string) => (
    <Input
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

  const modelSelect = (key: 'mainModel' | 'helperModel', label: (model: ContributeModel) => string) => (
    <Select value={draft[key]} onValueChange={(next) => set(key, next as ContributeModel)}>
      <SelectTrigger id={field(key)} className={selectClass}>
        <SelectValue>{label(draft[key])}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MODELS) as ContributeModel[]).map((model) => (
          <SelectItem key={model} value={model}>
            {label(model)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Panel id={page === 'budget' ? 'limits' : 'agent'}>
      {page === 'budget' ? (
        <>
          <Field label="Each billing cycle" htmlFor={field('cycleCapUsd')}>
            <div className="max-w-48">{textInput('cycleCapUsd')}</div>
            <span className="text-sm text-muted-foreground">
              We never start an attempt that could cross a limit. Amounts are at list price, the unit your credits are
              counted in.
            </span>
          </Field>

          <div id="pacing" className="flex scroll-mt-20 flex-col gap-2">
            <span id={`${field('pace')}-legend`} className="text-sm font-medium">
              How we spread the work
            </span>
            <RadioGroup
              aria-labelledby={`${field('pace')}-legend`}
              value={draft.pace}
              onValueChange={(next) => set('pace', next as ContributePace)}
              className="gap-2"
            >
              {(Object.keys(PACES) as ContributePace[]).map((pace) => (
                <label
                  key={pace}
                  htmlFor={`${field('pace')}-${pace}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                    draft.pace === pace && 'border-primary bg-brand-soft/50 ring-1 ring-primary',
                  )}
                >
                  <RadioGroupItem id={`${field('pace')}-${pace}`} value={pace} className="mt-1" />
                  <span className="flex flex-col">
                    <span className="font-medium">{PACES[pace].title}</span>
                    <span className="text-sm text-muted-foreground">{PACES[pace].text}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            <span className="text-sm text-muted-foreground">Your credits expire when they renew.</span>
          </div>

          <Fold
            id={`${id}-more`}
            anchor="more-limits"
            title="More limits"
            summary={moreLimitsSummaryOf(draft)}
            open={!folded}
            onToggle={() => setFolded(!folded)}
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
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
              <Field label="Sweep days" htmlFor={field('sweepDays')}>
                {textInput('sweepDays')}
              </Field>
              <Field label="Credits renew on" htmlFor={field('renewalDay')}>
                <Select value={String(draft.renewalDay)} onValueChange={(next) => set('renewalDay', Number(next))}>
                  <SelectTrigger id={field('renewalDay')} className={selectClass}>
                    <SelectValue>{ordinalDay(draft.renewalDay)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {ordinalDay(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <span className="text-sm text-muted-foreground">
              Leave week or day empty for no limit. A no-go check uses at most a tenth of the attempt limit before the
              agent decides whether to go on.
            </span>
          </Fold>
        </>
      ) : (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Main model" htmlFor={field('mainModel')}>
              {modelSelect('mainModel', (model) => MODELS[model])}
            </Field>
            <Field label="Effort" htmlFor={field('effort')}>
              <Select value={draft.effort} onValueChange={(next) => set('effort', next as ContributeEffort)}>
                <SelectTrigger id={field('effort')} className={selectClass}>
                  <SelectValue>{EFFORTS[draft.effort]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EFFORTS) as ContributeEffort[]).map((effort) => (
                    <SelectItem key={effort} value={effort}>
                      {EFFORTS[effort]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <span className="-mt-2 text-sm text-muted-foreground">
            Bigger models fix harder issues and cost more per attempt.
          </span>
          <Fold
            id={`${id}-models`}
            title="Models for smaller tasks"
            summary={`${helperModelLabelOf(draft.helperModel)} runs tests and reads logs · writing tests: ${testModelLabelOf(draft.testModel).toLowerCase()}`}
            open={!folded}
            onToggle={() => setFolded(!folded)}
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Running tests and reading logs" htmlFor={field('helperModel')}>
                {modelSelect('helperModel', helperModelLabelOf)}
              </Field>
              <Field label="Writing tests" htmlFor={field('testModel')}>
                <Select
                  value={draft.testModel ?? SAME_AS_MAIN}
                  onValueChange={(next) => set('testModel', next === SAME_AS_MAIN ? null : (next as ContributeModel))}
                >
                  <SelectTrigger id={field('testModel')} className={selectClass}>
                    <SelectValue>{testModelLabelOf(draft.testModel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SAME_AS_MAIN}>{testModelLabelOf(null)}</SelectItem>
                    {(Object.keys(MODELS) as ContributeModel[]).map((model) => (
                      <SelectItem key={model} value={model}>
                        {testModelLabelOf(model)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Fold>

          <div id="prs" className="flex scroll-mt-20 flex-col gap-3.5 border-t pt-4">
            <div className="flex flex-col gap-1">
              <h2 className={HEADING.block}>Pull requests</h2>
              <span className="text-sm text-muted-foreground">An attempt above these limits stops before review.</span>
            </div>
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
            <div className="flex flex-col gap-2">
              <span id={`${field('dco')}-legend`} className="text-sm font-medium">
                DCO sign-off, for repos that require it
              </span>
              <span id={`${field('dco')}-help`} className="-mt-1 text-xs text-muted-foreground">
                Some repos require a Developer Certificate of Origin sign-off on every commit; elsewhere nothing is
                asked and nothing is signed off.
              </span>
              <RadioGroup
                aria-labelledby={`${field('dco')}-legend`}
                aria-describedby={`${field('dco')}-help`}
                value={draft.dco}
                onValueChange={(next) => set('dco', next as ContributeDcoMode)}
                className="gap-2"
              >
                {(
                  [
                    ['ASK', 'Ask me on each PR to a repo that requires it'],
                    ['STANDING', 'Sign off automatically when a repo requires DCO'],
                  ] as const
                ).map(([dco, label]) => (
                  <label key={dco} htmlFor={`${field('dco')}-${dco}`} className="flex items-center gap-2.5 text-sm">
                    <RadioGroupItem id={`${field('dco')}-${dco}`} value={dco} />
                    {label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="button" size="lg" onClick={save} disabled={pending} className="px-5 font-semibold">
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {status ? (
          <span
            role={status.ok ? 'status' : 'alert'}
            className={cn('text-sm', status.ok ? 'text-positive' : 'text-destructive')}
          >
            {status.text}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
