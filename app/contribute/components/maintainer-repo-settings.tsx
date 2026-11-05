'use client';

import { type KeyboardEvent, useId, useState, useTransition } from 'react';

import { setMaintainerConfig } from '../maintainers/actions';
import { RadioPills, useSettledPick } from './radio-pills';
import { RuleSource } from './repo-rules';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  ContributeConfigKey,
  ContributeMaintainerConfigValue,
  ContributeMaintainerRepo,
  ContributeMaintainerRepoRules,
} from '@/lib/contribute/contribute.types';
import { maintainerConfigErrorMessage } from '@/lib/contribute/errors';
import { CONFIG_FILE } from '@/lib/contribute/maintainer-config';
import { fullDayLabel } from '@/lib/contribute/maintainers-format';
import {
  type ConfigControl,
  configDraftErrorOf,
  configNoteOf,
  fileReadAtOf,
  pageControlsOf,
  UNSET,
} from '@/lib/contribute/repo-rules';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';

const H3 = 'text-sm font-semibold';
const SMALL = 'text-xs text-muted-foreground';

/**
 * What we read from a repository (each rule with the repo's words, its source and who set it here), then a control for
 * each live key the page sets, saved as it changes: no Save button. A key the repo's file sets is shown, locked.
 */
export function MaintainerRepoSettings({
  repo,
  keys,
}: {
  repo: ContributeMaintainerRepo;
  /** Every key, as the page's facts list them: the live ones the page sets get a control. */
  keys: ContributeConfigKey[];
}) {
  const [config, setConfig] = useState(repo.config ?? []);
  const [rules, setRules] = useState(repo.rules);
  const controls = pageControlsOf(keys);
  const byKey = new Map(config.map((value) => [value.key, value]));

  return (
    <section
      data-repo-extras={repo.repoId}
      aria-label={`${repo.nameWithOwner}: rules and settings`}
      className="ml-3 grid gap-x-8 gap-y-5 border-l pl-4 lg:grid-cols-2"
    >
      <RulesWeRead rules={rules} readAt={fileReadAtOf(config)} />
      {controls.length ? (
        <div className="flex min-w-0 flex-col gap-4" data-repo-settings="">
          <div className="flex flex-col gap-1">
            <h3 className={H3}>Settings</h3>
            <span className={SMALL}>
              {repo.optedOut
                ? 'Opted out: none of these apply until it is back in.'
                : 'Each change saves as you make it and applies at once. Your docs say the rest.'}
            </span>
          </div>
          {controls.map((control) => (
            <ConfigField
              key={control.key}
              repoId={repo.repoId}
              control={control}
              value={byKey.get(control.key)}
              onSaved={(next) => {
                setConfig(next.config);
                setRules(next.rules);
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RulesWeRead({
  rules,
  readAt,
}: {
  rules: ContributeMaintainerRepoRules | null | undefined;
  readAt: string | null;
}) {
  const read = fullDayLabel(readAt);
  return (
    <div className="flex min-w-0 flex-col gap-2" data-repo-read="">
      <h3 className={H3}>What we read from your repo</h3>
      {!rules ? (
        <p className="text-sm text-muted-foreground">Not read yet. We read it before we pick any of its issues.</p>
      ) : rules.lines.length ? (
        <ul className="flex flex-col divide-y">
          {rules.lines.map((line, index) => (
            <li key={`${line.kind}-${index}`} data-rule={line.kind} className="flex flex-col items-start gap-1 py-2.5">
              <span className="text-sm font-medium">{line.text}</span>
              {line.quote ? <span className="text-sm text-muted-foreground">“{line.quote}”</span> : null}
              <span className="flex flex-wrap items-baseline gap-x-2">
                <RuleSource source={line.source} />
                {line.setBy ? (
                  <span className={SMALL} data-set-by={line.setBy}>
                    set by @{line.setBy}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing yet: its CONTRIBUTING, AI_POLICY.md, AGENTS.md, CLAUDE.md, .github/agents/ and {CONFIG_FILE} ask
          nothing of AI contributions that we follow.
        </p>
      )}
      <p className={SMALL}>
        {read ? `${CONFIG_FILE} read ${read}. ` : null}Something read wrong?{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-link hover:underline">
          Tell us
        </a>
        .
      </p>
    </div>
  );
}

type Status = { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; text: string } | null;

/** One key: its control, where its value comes from, and how the last change went. */
function ConfigField({
  repoId,
  control,
  value,
  onSaved,
}: {
  repoId: string;
  control: ConfigControl;
  value: ContributeMaintainerConfigValue | undefined;
  onSaved: (next: { config: ContributeMaintainerConfigValue[]; rules: ContributeMaintainerRepoRules | null }) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();
  const inFile = value?.source === 'FILE';
  const current = value?.value ?? null;

  const save = (next: string | null) =>
    startTransition(async () => {
      setStatus({ kind: 'saving' });
      const result = await setMaintainerConfig({ repoId, key: control.key, value: next });
      if (result.ok) {
        onSaved(result.data);
        setStatus({ kind: 'saved' });
      } else {
        setStatus({ kind: 'error', text: maintainerConfigErrorMessage(result.error) });
      }
    });

  const help = [control.hint, configNoteOf(value)].filter(Boolean).join(' ') || null;
  const helpId = `${id}-help`;
  const statusId = `${id}-status`;
  const describedBy = [help && helpId, status && statusId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5" data-config-key={control.key} data-config-source={value?.source ?? 'NONE'}>
      {control.type === 'pills' ? (
        <PillsField control={control} current={current} locked={inFile} save={save} />
      ) : (
        <>
          <label htmlFor={id} className="text-sm font-medium">
            {control.label}
          </label>
          {control.type === 'select' ? (
            <Select
              value={current ?? UNSET}
              disabled={inFile}
              onValueChange={(next) => save(next === UNSET ? null : next)}
            >
              <SelectTrigger id={id} aria-describedby={describedBy} className="w-full max-w-60 max-sm:min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {control.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TypedField
              id={id}
              control={control}
              current={current}
              locked={inFile}
              describedBy={describedBy}
              save={save}
              invalid={(text) => setStatus({ kind: 'error', text })}
              edited={() => setStatus((shown) => (shown?.kind === 'error' ? null : shown))}
            />
          )}
        </>
      )}
      {help ? (
        <span id={helpId} className={SMALL}>
          {help}
        </span>
      ) : null}
      {status ? (
        <span
          id={statusId}
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={cn('text-xs', status.kind === 'error' ? 'text-destructive' : 'text-muted-foreground')}
        >
          {status.kind === 'saving' ? 'Saving…' : status.kind === 'saved' ? 'Saved.' : status.text}
        </span>
      ) : null}
    </div>
  );
}

/** A choice of values, saved once the pick settles (arrowing through the pills saves only the last). */
function PillsField({
  control,
  current,
  locked,
  save,
}: {
  control: Extract<ConfigControl, { type: 'pills' }>;
  current: string | null;
  locked: boolean;
  save: (next: string | null) => void;
}) {
  const [picked, setPicked] = useState(current ?? UNSET);
  const settle = useSettledPick((next: string) => save(next === UNSET ? null : next));
  return (
    <fieldset disabled={locked} className={cn('min-w-0', locked && 'opacity-60')}>
      <RadioPills
        legend={control.label}
        legendClassName="mb-1.5"
        options={control.options}
        value={locked ? (current ?? UNSET) : picked}
        onChange={(next) => {
          setPicked(next);
          settle(next);
        }}
      />
    </fieldset>
  );
}

/** A number or a contact, saved when the field is left or Enter is pressed, and only when it changed. */
function TypedField({
  id,
  control,
  current,
  locked,
  describedBy,
  save,
  invalid,
  edited,
}: {
  id: string;
  control: Extract<ConfigControl, { type: 'number' | 'text' }>;
  current: string | null;
  locked: boolean;
  describedBy?: string;
  save: (next: string | null) => void;
  /** A value that can't be saved, in words. */
  invalid: (text: string) => void;
  /** The value changed since: an error about the last one goes. */
  edited: () => void;
}) {
  const [draft, setDraft] = useState(current ?? '');
  const commit = () => {
    const next = draft.trim();
    if (next === (current ?? '')) return;
    const error = configDraftErrorOf(control, next);
    if (error) invalid(error);
    else save(next || null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commit();
  };
  const number = control.type === 'number';
  return (
    <Input
      id={id}
      type={number ? 'number' : 'text'}
      inputMode={number ? 'numeric' : undefined}
      min={number ? (control.min ?? undefined) : undefined}
      max={number ? (control.max ?? undefined) : undefined}
      value={locked ? (current ?? '') : draft}
      placeholder={control.placeholder}
      disabled={locked}
      aria-describedby={describedBy}
      onChange={(event) => {
        setDraft(event.target.value);
        edited();
      }}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={cn(
        'h-auto rounded-lg py-2 text-sm max-sm:min-h-11',
        number ? 'max-w-48 font-mono tabular-nums' : 'max-w-md',
      )}
    />
  );
}
