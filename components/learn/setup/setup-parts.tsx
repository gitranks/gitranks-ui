import { Check } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

import { Kbd } from '@/components/learn/question/kbd';
import { Button } from '@/components/ui/button';
import type { LearnActionError } from '@/lib/learn/learn-action';
import { languageNameOf } from '@/lib/learn/learn-question';
import {
  levelHintOf,
  MAIN_LANGUAGE_HINT,
  missingWordsOf,
  OTHER_LANGUAGES_HINT,
  SETUP_LANGUAGES,
  SETUP_LEVELS,
  SETUP_PILL_WORDS,
  type SetupDestination,
  type SetupField,
  type SetupForm,
  type SetupPick,
  setupIntroOf,
  setupPillOf,
} from '@/lib/learn/setup';
import { cn } from '@/lib/utils';

/*
 * Set up Learn as page 5's boards draw it, from plain data: the three fields with their notes, the save, and the pages
 * with no form (signed out, a read that failed). The live page (`setup-live.tsx`) moves them; the catalogue draws each
 * state from a fixture.
 */

/** What the line under the save says: a field the save needs, why a save failed, or that it was saved. */
export type SetupNotice =
  | { kind: 'missing'; fields: SetupField[] }
  | { kind: 'error'; error: LearnActionError }
  | { kind: 'saved' };

const ERROR_WORDS: Record<LearnActionError, string> = {
  SIGNED_OUT: 'Your session ended. Sign in again, then save.',
  INVALID: 'Something here is not one Learn takes. Check the fields, then save.',
  CONFLICT: 'We could not save just now. Your choices are still here: try again in a minute.',
  NOT_FOUND: 'We could not save just now. Your choices are still here: try again in a minute.',
  FAILED: 'We could not save just now. Your choices are still here: try again in a minute.',
};

export function setupNoticeWordsOf(notice: SetupNotice): string {
  if (notice.kind === 'missing') return missingWordsOf(notice.fields);
  if (notice.kind === 'error') return ERROR_WORDS[notice.error];
  return 'Saved.';
}

/** The page's frame: as wide as the board draws it. */
export function SetupFrame({ children, state }: { children: ReactNode; state: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[860px] flex-col gap-7 px-4 pt-7 pb-11" data-learn-setup={state}>
      {children}
    </main>
  );
}

/** The ids each field's parts are named by, for its title, note and line. */
const idsOf = (field: SetupField) => ({
  title: `learn-setup-${field}`,
  pill: `learn-setup-${field}-pill`,
  hint: `learn-setup-${field}-hint`,
});

/** A field's title with its note ("Our guess", "You picked it", "For now") beside it, and its line. */
function SetupFieldHead({
  field,
  title,
  pill,
  hint,
}: {
  field: SetupField;
  title: string;
  pill: string | null;
  hint: string;
}) {
  const ids = idsOf(field);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h2 id={ids.title} className="m-0 text-lg font-semibold">
          {title}
        </h2>
        {pill ? (
          <span
            id={ids.pill}
            data-setup-pill=""
            className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-brand-soft-foreground uppercase"
          >
            {pill}
          </span>
        ) : null}
      </span>
      <span id={ids.hint} className="text-sm text-muted-foreground">
        {hint}
      </span>
    </div>
  );
}

/** One choice: a real radio or checkbox, drawn as the board's outlined option, the chosen one in the brand's tint. */
function SetupOption({
  type,
  name,
  checked,
  disabled,
  label,
  onChange,
  inputRef,
  value,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
  inputRef?: Ref<HTMLInputElement>;
  value: string;
}) {
  return (
    <label
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm',
        'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        checked && 'border-primary bg-brand-soft/40',
        disabled && 'cursor-default opacity-60',
      )}
    >
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center border',
          type === 'radio' ? 'rounded-full' : 'rounded-[4px]',
          checked ? 'border-primary' : 'border-muted-foreground',
          checked && type === 'checkbox' && 'bg-primary text-primary-foreground',
        )}
      >
        {checked && type === 'radio' ? <span className="size-2 rounded-full bg-primary" /> : null}
        {checked && type === 'checkbox' ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="font-medium">{label}</span>
    </label>
  );
}

/** The group's accessible description: its note when it has one, then its line. */
const describedBy = (field: SetupField, pill: string | null) =>
  pill ? `${idsOf(field).pill} ${idsOf(field).hint}` : idsOf(field).hint;

/**
 * The page with its form, in every state of page 5's board: our guess, still working, the guess arriving after the
 * person chose, nothing found, a setup saved before. `pending` draws the same page with nothing chosen and nothing to
 * press, while the person's setup is on its way. The fields change in place; nothing moves.
 */
export function SetupView({
  form,
  destination,
  hints,
  saving = false,
  notice = null,
  onPick,
  onSave,
  onSignIn,
  mainRef,
  levelRef,
}: {
  form: SetupForm;
  destination: SetupDestination;
  hints: boolean;
  saving?: boolean;
  notice?: SetupNotice | null;
  onPick: (pick: SetupPick) => void;
  onSave: () => void;
  onSignIn?: () => void;
  mainRef?: Ref<HTMLInputElement>;
  levelRef?: Ref<HTMLInputElement>;
}) {
  const pending = form.source === 'pending';
  const { mainLanguage, otherLanguages, level } = form.values;
  const pillOf = (field: SetupField) => {
    const pill = setupPillOf(form, field);
    return pill ? SETUP_PILL_WORDS[pill] : null;
  };
  const mainPill = pillOf('mainLanguage');
  const otherPill = pillOf('otherLanguages');
  const levelPill = pillOf('level');
  const others = SETUP_LANGUAGES.filter((language) => language !== mainLanguage);
  return (
    <SetupFrame state={form.arrived ? 'arrived' : form.source}>
      <header className="flex flex-col gap-1.5">
        <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Set up Learn</h1>
        <p aria-live="polite" className="m-0 max-w-[75ch] text-sm text-muted-foreground" data-setup-intro="">
          {setupIntroOf(form)}
        </p>
      </header>
      <form
        className="flex flex-col gap-7"
        noValidate
        aria-busy={pending || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending && !saving) onSave();
        }}
      >
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby={idsOf('mainLanguage').title}>
          <SetupFieldHead field="mainLanguage" title="Your main language" pill={mainPill} hint={MAIN_LANGUAGE_HINT} />
          <div
            role="radiogroup"
            aria-labelledby={idsOf('mainLanguage').title}
            aria-describedby={describedBy('mainLanguage', mainPill)}
            className="flex flex-wrap gap-2"
          >
            {SETUP_LANGUAGES.map((language, index) => (
              <SetupOption
                key={language}
                type="radio"
                name="mainLanguage"
                value={language}
                label={languageNameOf(language)}
                checked={mainLanguage === language}
                disabled={pending}
                onChange={() => onPick({ field: 'mainLanguage', language })}
                inputRef={index === 0 ? mainRef : undefined}
              />
            ))}
          </div>
        </section>
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby={idsOf('otherLanguages').title}>
          <SetupFieldHead
            field="otherLanguages"
            title="Other languages you use"
            pill={otherPill}
            hint={OTHER_LANGUAGES_HINT}
          />
          <fieldset
            aria-labelledby={idsOf('otherLanguages').title}
            aria-describedby={describedBy('otherLanguages', otherPill)}
            className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
          >
            {others.map((language) => (
              <SetupOption
                key={language}
                type="checkbox"
                name="otherLanguages"
                value={language}
                label={languageNameOf(language)}
                checked={otherLanguages.includes(language)}
                disabled={pending}
                onChange={() => onPick({ field: 'otherLanguages', language })}
              />
            ))}
          </fieldset>
        </section>
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby={idsOf('level').title}>
          <SetupFieldHead
            field="level"
            title="How much have you programmed?"
            pill={levelPill}
            hint={levelHintOf(level)}
          />
          <div
            role="radiogroup"
            aria-labelledby={idsOf('level').title}
            aria-describedby={describedBy('level', levelPill)}
            className="flex flex-wrap gap-2"
          >
            {SETUP_LEVELS.map((option, index) => (
              <SetupOption
                key={option.level}
                type="radio"
                name="level"
                value={String(option.level)}
                label={option.label}
                checked={level === option.level}
                disabled={pending}
                onChange={() => onPick({ field: 'level', level: option.level })}
                inputRef={index === 0 ? levelRef : undefined}
              />
            ))}
          </div>
        </section>
        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              type="submit"
              className="h-10 px-6 font-semibold"
              disabled={pending || saving}
              aria-describedby={notice ? 'learn-setup-notice' : undefined}
              data-setup-save=""
            >
              {destination.label}
              {hints ? <Kbd onPrimary>⏎</Kbd> : null}
            </Button>
            {form.source === 'saved' ? null : (
              <span className="text-sm text-muted-foreground">
                You can change this later in Settings, under Learn preferences.
              </span>
            )}
          </div>
          <div role="status" className="min-h-5" id="learn-setup-notice">
            {notice ? (
              <div className="flex flex-wrap items-center gap-3">
                <p
                  className={cn(
                    'm-0 text-sm',
                    notice.kind === 'saved' ? 'text-muted-foreground' : 'font-medium text-destructive',
                  )}
                  data-setup-notice={notice.kind === 'error' ? notice.error : notice.kind}
                >
                  {setupNoticeWordsOf(notice)}
                </p>
                {notice.kind === 'error' && notice.error === 'SIGNED_OUT' && onSignIn ? (
                  <Button type="button" variant="outline" size="sm" onClick={onSignIn}>
                    Sign in with GitHub
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </SetupFrame>
  );
}

/** A page with no form: its title, a line, and its one action. */
export function SetupMessage({
  state,
  title,
  text,
  titleRef,
  children,
}: {
  state: string;
  title: string;
  text: string;
  titleRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
}) {
  return (
    <SetupFrame state={state}>
      <section className="flex flex-col items-start gap-3">
        <h1 ref={titleRef} tabIndex={-1} className="m-0 text-2xl font-bold tracking-tight outline-none sm:text-3xl">
          {title}
        </h1>
        <p className="m-0 max-w-[75ch] text-base text-muted-foreground">{text}</p>
        {children ? <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div> : null}
      </section>
    </SetupFrame>
  );
}

/** A visitor, or a session that ended while the page was up: setup is the person's own, so the way in is signing in. */
export function SetupVisitor({
  ended = false,
  titleRef,
  onSignIn,
}: {
  ended?: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
  onSignIn: () => void;
}) {
  return (
    <SetupMessage
      state={ended ? 'ended' : 'visitor'}
      titleRef={titleRef}
      title={ended ? 'Sign in again to go on' : 'Setting up Learn needs an account'}
      text={
        ended
          ? 'Your session ended. Sign in, and you come back here.'
          : 'Learn keeps your languages and level with your account. Every lesson and course is open without one.'
      }
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onSignIn}>
        Sign in with GitHub
      </Button>
    </SetupMessage>
  );
}

/** A session whose setup did not come: nothing is lost, and the way to read it again. */
export function SetupFailed({ titleRef, onReload }: { titleRef?: Ref<HTMLHeadingElement>; onReload: () => void }) {
  return (
    <SetupMessage
      state="failed"
      titleRef={titleRef}
      title="Your setup did not load"
      text="Nothing is lost; we could not read it just now. Try again in a minute."
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onReload}>
        Try again
      </Button>
    </SetupMessage>
  );
}
