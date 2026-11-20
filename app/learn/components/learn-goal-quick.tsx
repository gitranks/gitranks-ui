'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HEADING } from '@/components/workspace/primitives';
import { saveLearnProfile } from '@/lib/learn/actions';
import type { LearnProfile, LearnProfileInput } from '@/lib/learn/learn.types';
import { LEARN_GOAL_LANGUAGES, levelFor } from '@/lib/learn/learn-home';
import { formOf, inputOf, LEVELS, withLevel } from '@/lib/learn/profile-form';
import { type LearnGoalPick, learnGoalLanguageOf, withLearnGoal } from '@/lib/learn/start-flow';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * What the quick goal saves: the language as the goal and its level, every other saved level and the focus kept as
 * they are (a guessed level stays a guess). Null without a language.
 */
export function quickGoalInputOf(
  profile: LearnProfile | null | undefined,
  language: string,
  level: number,
): LearnProfileInput | null {
  if (!language.trim()) return null;
  const form = { ...formOf(profile), goalKind: 'LANGUAGE' as const, language: language.trim() };
  return inputOf(withLevel(form, language.trim(), level));
}

/**
 * Learn's flow, step 1 (Your goal): the goal it starts from (the address's, or the saved one), and whether it is a
 * draft. A visitor's is: nothing is saved, and the button goes on to Pick an issue with the goal in the address. A
 * signed-in person's is saved, then the button goes on to Pick an issue.
 */
export type LearnGoalFlow = { initial: LearnGoalPick | null; draft: boolean };

/**
 * The goal question: a language Learn finds issues for, the level in it (pre-set to what Goal and level would show for
 * it), and the button. On the Learn tab it saves the goal as Goal and level does, then reads the page again in place,
 * which then shows the issues. In Learn's flow (`flow`) it is the step's own title, and the button reads "Show issues
 * for <language>". Projects, domains and the focus stay on Goal and level ("More choices", for an account only).
 */
export function LearnGoalQuick({ profile, flow }: { profile: LearnProfile | null; flow?: LearnGoalFlow }) {
  const router = useRouter();
  const id = useId();
  const initial = flow?.initial ?? null;
  const [language, setLanguage] = useState<string>(initial?.language ?? '');
  // A visitor's level starts at New to it; a signed-in person's once a language is picked, from their profile.
  const [level, setLevel] = useState<number | null>(
    initial ? (initial.level ?? levelFor(profile, initial.language)) : flow?.draft ? 0 : null,
  );
  const [touched, setTouched] = useState(initial?.level != null);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = saving || refreshing;

  const pickLanguage = (next: string) => {
    setLanguage(next);
    setError(null);
    if (!touched) setLevel(levelFor(profile, next));
  };

  const save = async () => {
    const chosen = learnGoalLanguageOf(language);
    if (flow?.draft) {
      if (!chosen || busy) return;
      const goal = { language: chosen, level: level ?? levelFor(profile, chosen) };
      startTransition(() => router.push(withLearnGoal(GETTING_IN_PATHS.learnIssues, goal)));
      return;
    }
    const input = quickGoalInputOf(profile, language, level ?? levelFor(profile, language));
    if (!input || busy) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveLearnProfile(input);
      if (!result.ok) {
        setError(
          result.error === 'NOT_FOUND'
            ? 'Your goal could not be saved. Reload the page and try again.'
            : contributeErrorMessage(result.error, result.message),
        );
        return;
      }
      // In the flow, on to Pick an issue; on the tab, the page reads itself again: with a goal saved, it shows the issues.
      startTransition(() => (flow ? router.push(GETTING_IN_PATHS.learnIssues) : router.refresh()));
    } catch {
      setError(contributeErrorMessage('FAILED'));
    } finally {
      setSaving(false);
    }
  };

  const Title = flow ? 'h1' : 'h2';
  const buttonLabel = flow ? (language ? `Show issues for ${language}` : 'Show issues') : 'Show my issues';

  return (
    <form
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-2xl border-2 border-primary bg-card p-5"
      data-goal-first=""
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-col gap-1">
        <Title id={`${id}-title`} className={flow ? HEADING.page : HEADING.section}>
          What do you want to learn?
        </Title>
        <p className="max-w-prose text-sm text-muted-foreground">
          Every lesson is written for this: the issues we show you, and what your agent explains.{' '}
          {flow ? 'You can change it later.' : 'Change it any time.'}
        </p>
      </div>
      <fieldset disabled={busy} className="m-0 flex flex-wrap items-end gap-4 border-0 p-0">
        <div className="flex min-w-0 flex-col gap-1.5 max-sm:w-full">
          <span id={`${id}-language`} className="text-sm font-semibold">
            Language
          </span>
          <Select value={language} onValueChange={pickLanguage}>
            <SelectTrigger aria-labelledby={`${id}-language`} className="w-full min-w-60 max-sm:min-h-11 sm:w-60">
              <SelectValue placeholder="Choose a language">{language || undefined}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LEARN_GOAL_LANGUAGES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0 max-sm:w-full">
          <legend className="float-left mb-1.5 text-sm font-semibold">Your level</legend>
          <div className="clear-left flex flex-wrap gap-0.75 rounded-lg bg-muted p-0.75">
            {LEVELS.map((label, value) => {
              const on = level === value;
              return (
                <label
                  key={label}
                  htmlFor={`${id}-level-${value}`}
                  data-level={value}
                  className={cn(
                    'flex min-h-8 cursor-pointer items-center rounded-md px-2.5 text-sm font-semibold transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 max-sm:min-h-11 max-sm:flex-1 max-sm:justify-center',
                    on ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <input
                    id={`${id}-level-${value}`}
                    type="radio"
                    name={`${id}-level`}
                    value={value}
                    checked={on}
                    onChange={() => {
                      setLevel(value);
                      setTouched(true);
                    }}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button
          type="submit"
          disabled={!language || busy}
          className="min-h-11 px-5 font-semibold max-sm:w-full"
          {...contributeSource(flow ? 'learn_flow_goal' : 'learn_home_goal')}
        >
          {busy && !flow?.draft ? 'Saving…' : buttonLabel}
        </Button>
      </fieldset>
      {flow?.draft ? null : (
        <Link
          href={WORKSPACE_PATHS.settingsGoal}
          prefetch={false}
          className="self-start text-sm font-semibold text-link max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
        >
          More choices: what to focus on →
        </Link>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
