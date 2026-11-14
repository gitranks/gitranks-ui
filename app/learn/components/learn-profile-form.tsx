'use client';

import { type ReactNode, useId, useState } from 'react';

import { Pill } from '@/app/contribute/components/primitives';
import { saveLearnProfile } from '@/app/learn/actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import type { LearnGoalKind, LearnProfile } from '@/lib/learn/learn.types';
import {
  FOCUS,
  type LearnProfileForm as Form,
  formOf,
  formProblemOf,
  GOALS,
  goalKindsOf,
  inputOf,
  LEVELS,
  languageChoicesOf,
  levelRowsOf,
  withFocus,
  withLevel,
} from '@/lib/learn/profile-form';
import { cn } from '@/lib/utils';

const CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-5';
const PICKED = 'border-primary bg-brand-soft/40';

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CARD}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      {children}
    </section>
  );
}

/** What the goal's own control is: the language's list, the project's name, or the saved domain. */
function GoalValue({ kind, form, onChange }: { kind: LearnGoalKind; form: Form; onChange: (form: Form) => void }) {
  if (kind === 'LANGUAGE') {
    return (
      <Select value={form.language} onValueChange={(language) => onChange({ ...form, language })}>
        <SelectTrigger aria-label="Language" className="mt-1.5 w-full max-w-60 max-sm:min-h-11">
          <SelectValue placeholder="Pick a language">{form.language || undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languageChoicesOf(form).map((language) => (
            <SelectItem key={language} value={language}>
              {language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (kind === 'PROJECT') {
    return (
      <Input
        aria-label="Project, as owner/repo"
        placeholder="owner/repo"
        value={form.project}
        onChange={(event) => onChange({ ...form, project: event.target.value })}
        className="mt-1.5 max-w-80 font-mono max-sm:min-h-11"
        autoComplete="off"
        spellCheck={false}
      />
    );
  }
  return form.domain ? <span className="mt-1.5 font-medium">{form.domain}</span> : null;
}

/**
 * Goal and level's form: the goal (radio cards, its language or project under the one picked), the level in each
 * language (guessed ones marked until the user sets them), the focus (checkboxes), and Save. A domain is offered only
 * when it is the saved goal, as there are no domains to pick from yet.
 */
export function LearnProfileForm({ profile }: { profile: LearnProfile | null }) {
  const [form, setForm] = useState<Form>(() => formOf(profile));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ saved: boolean; error: string | null }>({ saved: false, error: null });
  const id = useId();
  const change = (next: Form) => {
    setForm(next);
    setStatus({ saved: false, error: null });
  };
  const problem = formProblemOf(form);
  const rows = levelRowsOf(form);

  const save = async () => {
    const input = inputOf(form);
    if (!input || saving) return;
    setSaving(true);
    try {
      const result = await saveLearnProfile(input);
      if (result.ok) {
        setForm(formOf(result.data));
        setStatus({ saved: true, error: null });
      } else {
        setStatus({
          saved: false,
          // Not found: Learn is closed to this account now; the page says so plainly, as the API never names why.
          error:
            result.error === 'NOT_FOUND'
              ? 'Your goal and level could not be saved. Reload the page and try again.'
              : contributeErrorMessage(result.error, result.message),
        });
      }
    } catch {
      setStatus({ saved: false, error: contributeErrorMessage('FAILED') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex min-w-0 flex-col gap-4"
      data-learn-profile={form.goalKind ? 'filled' : 'empty'}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {/* Held while saving: the saved answer replaces the form, so nothing typed meanwhile is lost. */}
      <fieldset disabled={saving} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Section
          id={`${id}-goal`}
          title="What do you want to learn?"
          text="One goal at a time. It picks your issues and the deep dive of each lesson."
        >
          <RadioGroup
            aria-labelledby={`${id}-goal`}
            value={form.goalKind ?? ''}
            onValueChange={(kind) => change({ ...form, goalKind: kind as LearnGoalKind })}
            className="gap-2"
          >
            {goalKindsOf(form).map((kind) => {
              const on = form.goalKind === kind;
              return (
                <div
                  key={kind}
                  data-goal={kind}
                  className={cn('flex flex-col rounded-lg border p-3.5 text-sm', on && PICKED)}
                >
                  <label htmlFor={`${id}-goal-${kind}`} className="flex cursor-pointer items-start gap-3">
                    <RadioGroupItem
                      id={`${id}-goal-${kind}`}
                      value={kind}
                      aria-labelledby={`${id}-goal-${kind}-title`}
                      aria-describedby={`${id}-goal-${kind}-text`}
                      className="mt-0.5"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span id={`${id}-goal-${kind}-title`} className="font-semibold">
                        {GOALS[kind].title}
                      </span>
                      <span id={`${id}-goal-${kind}-text`} className="text-muted-foreground">
                        {GOALS[kind].text}
                      </span>
                    </span>
                  </label>
                  {on ? (
                    <div className="flex flex-col ps-7">
                      <GoalValue kind={kind} form={form} onChange={change} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </RadioGroup>
        </Section>

        <Section
          id={`${id}-levels`}
          title="Your level"
          text={
            rows.some((row) => row.guessed)
              ? 'We guessed from your public GitHub work. Correct anything that is off.'
              : 'Your level in each language. Lessons explain less of what you know well.'
          }
        >
          {rows.length ? (
            <div className="flex flex-col">
              {rows.map((row) => (
                <div
                  key={row.language}
                  data-level={row.language}
                  data-guessed={row.guessed || undefined}
                  className="grid items-center gap-x-4 gap-y-2 border-t py-3 first:border-t-0 sm:grid-cols-[200px_1fr]"
                >
                  <div className="flex flex-col">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      {row.language}
                      {row.guessed ? <Pill>Guessed</Pill> : null}
                    </span>
                    {row.note ? <span className="text-xs text-muted-foreground">{row.note}</span> : null}
                  </div>
                  <RadioGroup
                    aria-label={`${row.language} level`}
                    value={String(row.level)}
                    onValueChange={(level) => change(withLevel(form, row.language, Number(level)))}
                    className="flex flex-wrap gap-x-5 gap-y-2"
                  >
                    {LEVELS.map((label, level) => {
                      const radio = `${id}-level-${row.language}-${level}`;
                      return (
                        <label
                          key={label}
                          htmlFor={radio}
                          className="flex cursor-pointer items-center gap-2 text-sm max-sm:min-h-11"
                        >
                          <RadioGroupItem id={radio} value={String(level)} aria-label={label} />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground" data-levels="none">
              No languages yet. Pick a language as your goal and set your level in it.
            </p>
          )}
        </Section>

        <Section
          id={`${id}-focus`}
          title="What should lessons focus on?"
          text="Pick any. Lessons spend more of their steps there."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {FOCUS.map(({ value, label }) => {
              const on = form.focus.includes(value);
              return (
                <label
                  key={value}
                  htmlFor={`${id}-focus-${value}`}
                  data-focus={value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm max-sm:min-h-11',
                    on && PICKED,
                  )}
                >
                  <Checkbox
                    id={`${id}-focus-${value}`}
                    checked={on}
                    onCheckedChange={(checked) => change(withFocus(form, value, checked === true))}
                    aria-label={label}
                    className="mt-0.5"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </Section>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!!problem || saving} className="min-h-11 px-5 font-semibold">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {status.saved ? null : (
          <span className="text-sm text-muted-foreground" data-form-hint="">
            {problem ?? 'Used from your next lesson.'}
          </span>
        )}
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
          {status.saved ? 'Saved. Used from your next lesson.' : ''}
        </span>
      </div>
      {status.error ? (
        <p role="alert" className="text-sm text-destructive">
          {status.error}
        </p>
      ) : null}
    </form>
  );
}
