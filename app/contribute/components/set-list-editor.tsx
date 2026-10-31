'use client';

import { ChevronDown, CircleAlert, Search, X } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { addToContributeSet, ignoreContributeRepo, removeFromContributeSet } from '../actions';
import type { FeedbackOpen } from './feedback-dialog';
import { Meter, Pill, SubTitle } from './primitives';
import { RulesDialog } from './set-panels';
import type { SetWrite } from './set-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  ContributeSet,
  ContributeSetAddResult,
  ContributeSetListMode,
  ContributeSetRepo,
} from '@/lib/contribute/contribute.types';
import { dayLabel, LANGUAGES } from '@/lib/contribute/format';
import { starsLabel } from '@/lib/contribute/maintainers-format';
import {
  ADD_INPUT_MAX,
  addNoticeOf,
  listOf,
  plural,
  rulesOf,
  type SetRules,
  statusOf,
  viaGroupsOf,
} from '@/lib/contribute/set-format';
import { settingsPathOf } from '@/lib/contribute/settings-paths';
import { cn } from '@/lib/utils';

/** Rows a group shows before "Show more". */
const GROUP_ROWS = 5;

type Notice = ReturnType<typeof addNoticeOf>;

/** "just now" within the hour, else the day it was added. */
const addedLabel = (iso: string, now = new Date()) =>
  now.getTime() - new Date(iso).getTime() < 60 * 60 * 1000 ? 'just now' : dayLabel(iso);

/** The active mode's list: one input to add a repo, a user or an org, and the repos grouped by how they got there. */
export function SetListEditor({
  set,
  mode,
  write,
  onFeedback,
  now,
  divided = true,
}: {
  set: ContributeSet;
  mode: ContributeSetListMode;
  write: SetWrite;
  onFeedback: (open: FeedbackOpen) => void;
  now?: Date;
  /** A rule above it, under what comes before it in its panel. */
  divided?: boolean;
}) {
  const id = useId();
  const { list, repos, count, cap } = listOf(set, mode);
  const rules = rulesOf(list);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();
  const ignoreFull = set.ignore.length >= set.limits.ignore;
  const meAdded = repos.some(({ via }) => via.kind === 'ME');
  const nearFull = count >= cap * 0.8;

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || adding) return;
    startAdding(async () => {
      setError(null);
      setNotice(null);
      const answer: { result?: ContributeSetAddResult } = {};
      const failure = await write(async () => {
        const result = await addToContributeSet(list, trimmed);
        if (!result.ok) return result;
        answer.result = result.data;
        return { ok: true as const, data: result.data.set };
      }, 'add');
      if (failure) {
        setError(failure);
        return;
      }
      if (answer.result) {
        const after = listOf(answer.result.set, mode);
        setNotice(
          addNoticeOf(trimmed, answer.result, {
            count: after.count,
            cap: after.cap,
            rules,
            listed: after.repos.map(({ repositoryId }) => repositoryId),
          }),
        );
        if (trimmed !== '@me') setInput('');
      }
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add(input);
  };

  return (
    <div className={cn('flex flex-col gap-3', divided && 'border-t pt-4')} data-list={list}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <SubTitle>{list === 'SOURCES' ? "Your stack's sources" : 'Repos you support'}</SubTitle>
          <p className="text-xs text-muted-foreground">
            {list === 'SOURCES'
              ? 'We read the dependency files (package.json, go.mod, pyproject.toml, Cargo.toml…) of these repos.'
              : 'Add a repo, or a user or org to add its most popular repos.'}
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground" data-count={count}>
          <span className={cn('text-foreground', count >= cap && 'font-medium')}>{count}</span> / {cap} repos
        </span>
      </div>
      {nearFull ? <Meter value={count} max={cap} label={`${count} of ${cap} repos on the list`} /> : null}

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-[1_1_240px]">
          <label htmlFor={`${id}-add`} className="sr-only">
            Add a repo, a user or an org
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={`${id}-add`}
            value={input}
            maxLength={ADD_INPUT_MAX}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Add a repo, a user or an org — vercel, facebook/react, github.com/…"
            autoComplete="off"
            spellCheck={false}
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10" disabled={adding || !input.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={adding}
          onClick={() => add('@me')}
          aria-label={meAdded ? 'Add your own public repos again' : 'Add your own public repos'}
        >
          <span className="font-mono text-xs">@me</span> My repos
          {meAdded ? <Pill tone="green">added</Pill> : null}
        </Button>
      </form>

      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      {notice ? <AddNotice notice={notice} onDismiss={() => setNotice(null)} /> : null}

      {repos.length ? (
        <div className="overflow-hidden rounded-xl border">
          {viaGroupsOf(repos).map((group, index) => (
            <ViaGroupRows
              key={group.key}
              label={group.label}
              detail={`${plural(group.repos.length, 'repo')}${group.key === 'REPO' ? '' : ` · added ${addedLabel(group.addedAt, now)}`}`}
              repos={group.repos}
              first={index === 0}
              list={list}
              rules={rules}
              mode={mode}
              ignoreFull={ignoreFull}
              ignoreCap={set.limits.ignore}
              write={write}
              onFeedback={onFeedback}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          No repos yet. Add your own with @me, or a user, an org or a repo.
        </p>
      )}
      {ignoreFull ? (
        <p className="text-xs text-muted-foreground">
          Your ignore list is full ({set.limits.ignore}):{' '}
          <Link
            href={settingsPathOf('ignored')}
            prefetch={false}
            className="text-link underline-offset-2 hover:underline"
          >
            unignore a repo
          </Link>{' '}
          first to ignore another.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {list === 'SOURCES'
          ? `A user or org adds its public repos that pass the source rules, most stars first, up to ${cap}. `
          : `A user or org adds its repos that pass the rules, most stars first, up to ${cap}. We check every repo for new issues every 12 hours. `}
        <RulesDialog onFeedback={() => onFeedback({ topic: 'GATES', context: { mode } })} />
      </p>
    </div>
  );
}

/** The add's answer: what was added, what did not fit, and why the rest was left out. */
function AddNotice({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  return (
    <div
      role="status"
      data-add-notice={notice.tone}
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 text-sm',
        notice.tone === 'warn' ? 'border-warning/40 bg-warning-soft' : 'border-primary/20 bg-brand-soft',
      )}
    >
      <CircleAlert
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0',
          notice.tone === 'warn' ? 'text-warning-soft-foreground' : 'text-brand-soft-foreground',
        )}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium">{notice.title}</p>
        {notice.details.map((line) => (
          <p key={line} className="text-xs text-foreground/75">
            {line}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-auto self-start rounded text-muted-foreground hover:text-foreground"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/** One group of a list: a header that folds it, its first rows and "Show more". */
function ViaGroupRows({
  label,
  detail,
  repos,
  first,
  ...row
}: {
  label: string;
  detail: string;
  repos: ContributeSetRepo[];
  first: boolean;
} & Omit<Parameters<typeof RepoRow>[0], 'repo'>) {
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  const id = useId();
  const shown = all ? repos : repos.slice(0, GROUP_ROWS);

  return (
    <div data-group={label}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-2 bg-muted/60 px-4 py-2 text-left text-xs hover:bg-muted',
          !first && 'border-t',
        )}
      >
        <ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">· {detail}</span>
      </button>
      {open ? (
        <ul id={id} className="divide-y border-t">
          {shown.map((repo) => (
            <RepoRow key={repo.repositoryId} repo={repo} {...row} />
          ))}
          {repos.length > shown.length ? (
            <li className="px-4 py-2">
              <button type="button" onClick={() => setAll(true)} className="text-xs text-link hover:underline">
                Show {repos.length - shown.length} more
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** A repo on a list: name, stars, language, status, and Remove and Ignore. */
function RepoRow({
  repo,
  list,
  rules,
  mode,
  ignoreFull,
  ignoreCap,
  write,
  onFeedback,
}: {
  repo: ContributeSetRepo;
  list: ReturnType<typeof listOf>['list'];
  rules: SetRules;
  mode: ContributeSetListMode;
  ignoreFull: boolean;
  ignoreCap: number;
  write: SetWrite;
  onFeedback: (open: FeedbackOpen) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = statusOf(repo, rules);
  const failed = repo.status === 'FAILED';
  const unsupported = repo.status === 'UNSUPPORTED';

  const remove = () =>
    startTransition(async () => {
      setError(await write(() => removeFromContributeSet(list, [repo.repositoryId]), 'change'));
    });
  const ignore = () =>
    startTransition(async () => {
      setError(await write(() => ignoreContributeRepo(repo.repositoryId), 'ignore'));
    });

  return (
    <li
      data-repo={repo.nameWithOwner}
      data-status={repo.status}
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm', unsupported && 'opacity-60')}
    >
      <a
        href={`https://github.com/${repo.nameWithOwner}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 font-mono text-[13px] break-all hover:underline"
      >
        {repo.nameWithOwner}
      </a>
      <span className="text-xs text-muted-foreground">
        <span aria-hidden="true">★</span>
        <span className="sr-only">Stars:</span> {starsLabel(repo.stars)}
      </span>
      {repo.language ? <span className="text-xs text-muted-foreground">{LANGUAGES[repo.language]}</span> : null}
      <Pill tone={status.tone}>{status.label}</Pill>
      <span className="ml-auto flex flex-wrap gap-1">
        {failed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onFeedback({ topic: 'GATES', context: { mode, repo: repo.nameWithOwner, reasons: repo.reasons }, rules })
            }
          >
            Suggest a change
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={remove}
          aria-label={`Remove ${repo.nameWithOwner}`}
        >
          Remove
        </Button>
        {failed || unsupported ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || ignoreFull}
            title={ignoreFull ? `Your ignore list is full (${ignoreCap}): unignore a repo first` : undefined}
            onClick={ignore}
            aria-label={`Ignore ${repo.nameWithOwner}`}
          >
            Ignore
          </Button>
        )}
      </span>
      {error ? (
        <span role="alert" className="basis-full text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </li>
  );
}
