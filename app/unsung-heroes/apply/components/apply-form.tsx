'use client';

import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { resolveApplyPackage, sendApplication } from '../actions';
import { ApplyCard, PackageLine, RegistryPill } from './apply-parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { CodeBlock } from '@/components/workspace/code-block';
import { CopyButton } from '@/components/workspace/copy-button';
import type {
  ApplyPackage,
  ApplyRegistry,
  ApplyResolved,
  ApplySendInput,
  HeroApplication,
} from '@/lib/unsung-hero/apply.types';
import {
  APPLY_NOTE_MAX,
  APPLY_TYPED_MAX,
  packageKey,
  packageNameOf,
  RESOLVE_DEBOUNCE_MS,
  refusalTextOf,
  usageShort,
} from '@/lib/unsung-hero/apply-copy';
import { applyPromptOf, type PromptPackage } from '@/lib/unsung-hero/apply-prompt';
import { cn } from '@/lib/utils';

/** Where the form starts: nothing chosen, unless the catalogue draws a later step. */
export type ApplyFormStart = {
  /** A package of the viewer's own, by `packageKey`. */
  chosen?: string;
  /** A nomination as typed, and what the lookup answered. */
  nominate?: { typed: string; resolved: ApplyResolved | null; picked?: string };
  note?: string;
  promptOpen?: boolean;
};

/** What would be sent: a package we found, or a nomination as typed; and how the send names it. */
type Subject = { pkg: ApplyPackage | null; name: string; prompt: PromptPackage; send: ApplySendInput };

const UNAVAILABLE: ApplyResolved = { status: 'UNAVAILABLE', packages: [] };

const subjectOfPackage = (pkg: ApplyPackage, send: ApplySendInput): Subject => ({
  pkg,
  name: packageNameOf(pkg),
  prompt: pkg,
  send,
});

/** What the lookup of a nomination says under the field. */
function Resolution({
  typed,
  resolved,
  registries,
  picked,
  onPick,
}: Readonly<{
  typed: string;
  resolved: ApplyResolved | null;
  registries: readonly ApplyRegistry[];
  picked: string | null;
  onPick: (key: string) => void;
}>) {
  const listId = useId();
  if (!typed) return null;
  if (!resolved) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Looking it up…
      </p>
    );
  }
  if (resolved.status === 'FOUND' && resolved.packages[0]) {
    return (
      <div role="status" className="flex rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <PackageLine pkg={resolved.packages[0]} registries={registries} found />
      </div>
    );
  }
  if (resolved.status === 'AMBIGUOUS') {
    return (
      <div className="flex flex-col gap-2">
        <p role="status" className="text-sm">
          That name is in more than one registry. Which one do you mean?
        </p>
        <RadioGroup
          value={picked ?? ''}
          onValueChange={onPick}
          aria-label="Packages with that name"
          className="gap-0 overflow-hidden rounded-lg border"
        >
          {resolved.packages.map((pkg, index) => {
            const key = packageKey(pkg);
            return (
              <label
                key={key}
                htmlFor={`${listId}-${index}`}
                className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-accent/60 has-[[data-state=checked]]:bg-accent/60"
              >
                <RadioGroupItem id={`${listId}-${index}`} value={key} />
                <PackageLine pkg={pkg} registries={registries} />
              </label>
            );
          })}
        </RadioGroup>
      </div>
    );
  }
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {resolved.status === 'UNAVAILABLE'
        ? 'The lookup did not answer just now. You can still send it as typed.'
        : 'We could not find it. You can still send it as typed: say in the note where it lives.'}
    </p>
  );
}

/** The optional prompt for the viewer's own agent: copy it, or open it to read. */
function PromptBox({
  subject,
  registries,
  open,
  onToggle,
}: Readonly<{ subject: Subject; registries: readonly ApplyRegistry[]; open: boolean; onToggle: () => void }>) {
  const id = useId();
  const prompt = applyPromptOf(subject.prompt, registries);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <ApplyCard className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold">Check it with your agent (optional)</h2>
          <p className="text-sm text-muted-foreground">
            A prompt for Claude Code, Cursor, Codex or any coding agent: it checks {subject.name} against the rules and
            suggests fixes.
          </p>
        </div>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex items-center gap-1 self-start rounded-sm text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Chevron aria-hidden="true" className="size-4" />
        {open ? 'Hide the prompt' : 'Show the prompt'}
      </button>
      <div id={id} hidden={!open}>
        {open && (
          <CodeBlock label="Prompt for your agent" copyLabel="Copy the prompt" wrap>
            {prompt}
          </CodeBlock>
        )}
      </div>
    </ApplyCard>
  );
}

/**
 * Applying: "1. Choose a package" (the viewer's own, or "Nominate another package" by name or registry link, looked
 * up as they type), then the optional prompt for their agent and "2. Tell us about it" with Send. The page runs no
 * checks of its own: we check every application ourselves. `onSent` hears of the application the send made.
 */
export function ApplyForm({
  registries,
  packages,
  start,
  onSent,
}: Readonly<{
  registries: readonly ApplyRegistry[];
  packages: readonly ApplyPackage[];
  start?: ApplyFormStart;
  onSent: (application: HeroApplication) => void;
}>) {
  const [nominating, setNominating] = useState(!!start?.nominate || packages.length === 0);
  const [chosen, setChosen] = useState<string | null>(start?.chosen ?? null);
  const [typed, setTyped] = useState(start?.nominate?.typed ?? '');
  const [resolved, setResolved] = useState<{ input: string; answer: ApplyResolved } | null>(
    start?.nominate?.resolved ? { input: start.nominate.typed.trim(), answer: start.nominate.resolved } : null,
  );
  const [picked, setPicked] = useState<string | null>(start?.nominate?.picked ?? null);
  const [note, setNote] = useState(start?.note ?? '');
  const [promptOpen, setPromptOpen] = useState(!!start?.promptOpen);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const asked = useRef(0);
  const nominateId = useId();
  const ownId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  /** A nomination is looked up once typing pauses; an answer for an older text is dropped. */
  const type = (value: string) => {
    setTyped(value);
    setPicked(null);
    setRefusal(null);
    clearTimeout(timer.current);
    const input = value.trim();
    if (!input) return;
    timer.current = setTimeout(async () => {
      const ask = ++asked.current;
      const answer = await resolveApplyPackage(input).catch(() => UNAVAILABLE);
      if (ask === asked.current) setResolved({ input, answer });
    }, RESOLVE_DEBOUNCE_MS);
  };

  const typedNow = typed.trim();
  const answer = resolved && resolved.input === typedNow ? resolved.answer : null;

  let subject: Subject | null = null;
  if (!nominating) {
    const pkg = packages.find((each) => packageKey(each) === chosen);
    if (pkg) subject = subjectOfPackage(pkg, { registry: pkg.registry, name: pkg.name });
  } else if (typedNow && answer) {
    if (answer.status === 'FOUND' && answer.packages[0]) {
      subject = subjectOfPackage(answer.packages[0], { typed: typedNow });
    } else if (answer.status === 'AMBIGUOUS') {
      const pkg = answer.packages.find((each) => packageKey(each) === picked);
      if (pkg) subject = subjectOfPackage(pkg, { registry: pkg.registry, name: pkg.name });
    } else {
      subject = { pkg: null, name: typedNow, prompt: { registry: null, name: typedNow }, send: { typed: typedNow } };
    }
  }

  const send = async () => {
    if (!subject || sending) return;
    setSending(true);
    setRefusal(null);
    const result = await sendApplication({ ...subject.send, ...(note.trim() ? { note: note.trim() } : {}) }).catch(
      () => null,
    );
    setSending(false);
    if (!result?.ok) {
      setRefusal(refusalTextOf(result?.refusal ?? null));
      return;
    }
    onSent(
      result.application ?? {
        status: 'IN_REVIEW',
        package: subject.pkg,
        typed: subject.pkg ? null : typedNow,
        note: note.trim() || null,
        sentAt: new Date().toISOString(),
        week: null,
      },
    );
  };

  return (
    <>
      <ApplyCard className="gap-0 p-0">
        <div className="flex flex-col gap-1 p-5 pb-4">
          <h2 className="text-lg font-semibold">1. Choose a package</h2>
          <p className="text-sm text-muted-foreground">
            {packages.length
              ? 'Packages published from repositories your account owns.'
              : 'We found no packages published from repositories your account owns. Nominate one by its name.'}
          </p>
        </div>
        {packages.length > 0 && (
          <RadioGroup
            value={nominating ? '' : (chosen ?? '')}
            onValueChange={(value) => {
              setChosen(value);
              setNominating(false);
              setRefusal(null);
            }}
            aria-label="Packages from repositories you own"
            className="gap-0 border-t"
          >
            {packages.map((pkg, index) => {
              const key = packageKey(pkg);
              const usage = usageShort(pkg);
              return (
                <label
                  key={key}
                  htmlFor={`${ownId}-${index}`}
                  className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-accent/60 has-[[data-state=checked]]:bg-accent/60 max-sm:min-h-11"
                >
                  <RadioGroupItem id={`${ownId}-${index}`} value={key} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{packageNameOf(pkg)}</span>
                      <RegistryPill registries={registries} id={pkg.registry} />
                    </span>
                    {pkg.repository && <span className="truncate text-xs text-muted-foreground">{pkg.repository}</span>}
                  </span>
                  {usage && <span className="font-mono text-sm text-muted-foreground tabular-nums">{usage}</span>}
                </label>
              );
            })}
          </RadioGroup>
        )}
        <div className="flex flex-col gap-3 border-t p-5">
          {nominating ? (
            <>
              <Label htmlFor={nominateId}>Another package: its name or a link to it</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id={nominateId}
                  value={typed}
                  maxLength={APPLY_TYPED_MAX}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="A package name, or its registry page"
                  className="pl-9"
                  onChange={(event) => type(event.target.value)}
                />
              </div>
              <Resolution
                typed={typedNow}
                resolved={answer}
                registries={registries}
                picked={picked}
                onPick={setPicked}
              />
              <span className="text-xs text-muted-foreground">
                Someone else’s package, or one from an organization’s repository. Say in the note why it belongs here.
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNominating(true);
                setRefusal(null);
              }}
              className="self-start rounded-sm text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring max-sm:min-h-11"
            >
              Nominate another package →
            </button>
          )}
        </div>
      </ApplyCard>

      {subject && (
        <>
          <PromptBox
            subject={subject}
            registries={registries}
            open={promptOpen}
            onToggle={() => setPromptOpen((open) => !open)}
          />
          <ApplyCard>
            <h2 className="text-lg font-semibold break-words">2. Tell us about {subject.name}</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="hero-note">A note for us (optional)</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {note.length}/{APPLY_NOTE_MAX}
                </span>
              </div>
              <Textarea
                id="hero-note"
                rows={3}
                maxLength={APPLY_NOTE_MAX}
                value={note}
                placeholder="Who depends on it, what it saves people, why it deserves a week"
                onChange={(event) => setNote(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">Up to 500 characters. Only we read it.</span>
            </div>
            {refusal && (
              <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                {refusal}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">One open application per account.</span>
              <Button type="button" onClick={send} disabled={sending} className={cn(sending && 'cursor-progress')}>
                {sending ? 'Sending…' : 'Send application'}
              </Button>
            </div>
          </ApplyCard>
        </>
      )}
    </>
  );
}
