'use client';

import { Check, MessageSquare } from 'lucide-react';
import { useState, useTransition } from 'react';

import { unignoreContributeRepo } from '../actions';
import { Eyebrow } from './primitives';
import type { SetWrite } from './set-section';
import { useHashOpen } from './use-hash-open';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ContributeIgnoredRepo, ContributeSet } from '@/lib/contribute/contribute.types';
import { SOURCE_RULES, WORK_RULES } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

function Rules({ title, rules }: { title: string; rules: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <ul className="flex flex-col gap-1.5 text-sm">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-positive" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The rules a repo the user adds must pass, in plain words, with how often lists are checked. */
export function RulesContent() {
  return (
    <div className="flex flex-col gap-4" data-rules>
      <div className="grid gap-4 sm:grid-cols-2">
        <Rules title="Repos we work on" rules={WORK_RULES} />
        <div className="flex flex-col gap-2">
          <Rules title="Stack sources" rules={SOURCE_RULES} />
          <p className="text-xs text-muted-foreground">Any language: a Kotlin app&apos;s Java libraries count.</p>
        </div>
      </div>
      <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
        Lists hold up to 50 repos each, and we check every repo for new issues every 12 hours. Repos you add are read
        right away.
      </p>
    </div>
  );
}

/**
 * "How we pick repos" as a link-styled button that opens the rules, with Suggest a change (which closes them and opens
 * the feedback). Opens by itself when the page's URL ends in `#rules`.
 */
export function RulesDialog({ onFeedback, className }: { onFeedback: () => void; className?: string }) {
  const [open, setOpen] = useHashOpen('rules');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={cn('text-link underline-offset-2 hover:underline', className)}>
          How we pick repos
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>How we pick repos</DialogTitle>
          <DialogDescription>
            We only send PRs where they have a fair chance of being reviewed. A repo you add must pass these rules.
          </DialogDescription>
        </DialogHeader>
        <RulesContent />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              onFeedback();
            }}
          >
            <MessageSquare aria-hidden="true" />
            Suggest a change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The repos never picked, in any mode, with Unignore, and what to do when the list is full. */
export function IgnoredList({ set, write }: { set: ContributeSet; write: SetWrite }) {
  const full = set.ignore.length >= set.limits.ignore;
  return (
    <div className="flex flex-col gap-3" data-ignored>
      <span className="font-mono text-xs text-muted-foreground" data-count={set.ignore.length}>
        <span className="text-foreground">{set.ignore.length}</span> / {set.limits.ignore}
      </span>
      {set.ignore.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {set.ignore.map((repo) => (
            <IgnoredChip key={repo.repositoryId} repo={repo} write={write} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          None yet. Ignore a repo from a list and it is never picked for you again.
        </p>
      )}
      {full ? (
        <p className="text-sm text-warning-soft-foreground">
          Your ignore list is full ({set.limits.ignore}): unignore a repo first to ignore another.
        </p>
      ) : null}
    </div>
  );
}

function IgnoredChip({ repo, write }: { repo: ContributeIgnoredRepo; write: SetWrite }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const unignore = () =>
    startTransition(async () => {
      setError(await write(() => unignoreContributeRepo(repo.repositoryId), 'change'));
    });

  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
        <span className="font-mono text-xs break-all">{repo.nameWithOwner}</span>
        <button
          type="button"
          onClick={unignore}
          disabled={pending}
          aria-label={`Unignore ${repo.nameWithOwner}`}
          className="text-xs text-link hover:underline disabled:opacity-50"
        >
          {pending ? 'Unignoring…' : 'Unignore'}
        </button>
      </span>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </li>
  );
}
