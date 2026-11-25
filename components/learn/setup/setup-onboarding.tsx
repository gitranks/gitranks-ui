import Link from 'next/link';
import type { Ref } from 'react';

import { type SetupNotice, SetupOption, setupNoticeWordsOf } from './setup-parts';
import { Button } from '@/components/ui/button';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { Kbd } from '@/components/workspace/kbd';
import { HEADING } from '@/components/workspace/primitives';
import { languageNameOf } from '@/lib/learn/learn-question';
import { HOW_LEARN_WORKS, ONBOARDING_STEPS, YOUR_LANGUAGES_TEXT } from '@/lib/learn/onboarding';
import { LEARN_PREFERENCES_PATH } from '@/lib/learn/paths';
import { SETUP_LANGUAGES, type SetupLanguage } from '@/lib/learn/setup';
import { cn } from '@/lib/utils';

/*
 * Learn's onboarding as its boards draw it, from plain data: two steps in one frame like Contribute's, under the strip
 * of Learn's own two steps. The live page (`setup-live.tsx`) moves them; the catalogue draws each state from a fixture.
 */

/** The first step, "How Learn works": the line saying where the person goes after, the three lines, and "Continue". */
export function OnboardingHow({
  line,
  lineMayGrow = false,
  hints,
  onContinue,
}: {
  /** Where the person goes once the onboarding is done, when a page sent them here. */
  line: string | null;
  /**
   * The line may get longer once the browser's storage is read ("Your answer is kept." first): on a phone it holds two
   * lines from the first paint, so the title does not move down.
   */
  lineMayGrow?: boolean;
  hints: boolean;
  onContinue: () => void;
}) {
  return (
    <FlowFrame side="learn" steps={ONBOARDING_STEPS} step={1}>
      <div className="flex flex-col gap-2" data-onboarding-step="how">
        {line ? (
          <p
            className={cn('m-0 text-sm font-medium text-muted-foreground', lineMayGrow && 'max-sm:min-h-[2lh]')}
            data-onboarding-line=""
          >
            {line}
          </p>
        ) : null}
        <h1 className={HEADING.page}>How Learn works</h1>
      </div>
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {HOW_LEARN_WORKS.map((item, index) => (
          <li key={item.title} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs"
            >
              {index + 1}
            </span>
            <p className="m-0 max-w-prose text-base">
              <b className="font-semibold">{item.title}</b> <span className="text-muted-foreground">{item.text}</span>
            </p>
          </li>
        ))}
      </ol>
      <div className="border-t pt-5">
        <Button type="button" className="h-10 px-6 font-semibold" onClick={onContinue} data-onboarding-continue="">
          Continue
          {hints ? <Kbd onPrimary>⏎</Kbd> : null}
        </Button>
      </div>
    </FlowFrame>
  );
}

/**
 * The second step, "Your languages": Learn's seven languages as chips, those of our guess (or of a setup saved before) ticked to
 * start, and "Save and start", off while nothing is ticked. `pending`: the setup is on its way, nothing to press yet.
 */
export function OnboardingLanguages({
  ticked,
  pending = false,
  saving = false,
  notice = null,
  hints,
  onTick,
  onSave,
  onSignIn,
  titleRef,
}: {
  ticked: readonly SetupLanguage[];
  pending?: boolean;
  saving?: boolean;
  notice?: SetupNotice | null;
  hints: boolean;
  onTick: (language: SetupLanguage) => void;
  onSave: () => void;
  onSignIn?: () => void;
  /** The title, which takes the focus when the step opens. */
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const off = pending || saving || ticked.length === 0;
  return (
    <FlowFrame side="learn" steps={ONBOARDING_STEPS} step={2}>
      <div className="flex flex-col gap-2" data-onboarding-step="languages">
        <h1 ref={titleRef} tabIndex={-1} id="learn-onboarding-languages" className={cn(HEADING.page, 'outline-none')}>
          Your languages
        </h1>
        <p className="m-0 max-w-prose text-base text-muted-foreground" id="learn-onboarding-languages-text">
          {YOUR_LANGUAGES_TEXT}
        </p>
      </div>
      <form
        className="flex flex-col gap-7"
        noValidate
        aria-busy={pending || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          if (!off) onSave();
        }}
      >
        <fieldset
          aria-labelledby="learn-onboarding-languages"
          aria-describedby="learn-onboarding-languages-text"
          className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
        >
          {SETUP_LANGUAGES.map((language) => (
            <SetupOption
              key={language}
              type="checkbox"
              name="languages"
              value={language}
              label={languageNameOf(language)}
              checked={ticked.includes(language)}
              disabled={pending}
              onChange={() => onTick(language)}
            />
          ))}
        </fieldset>
        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              type="submit"
              className="h-10 px-6 font-semibold"
              disabled={off}
              aria-describedby={notice ? 'learn-onboarding-notice' : undefined}
              data-onboarding-save=""
            >
              Save and start
              {hints ? <Kbd onPrimary>⏎</Kbd> : null}
            </Button>
            <span className="text-sm text-muted-foreground" data-setup-later="">
              You can change this later in{' '}
              <Link href={LEARN_PREFERENCES_PATH} prefetch={false} className="font-semibold text-link hover:underline">
                Settings
              </Link>
              , under Learn preferences.
            </span>
          </div>
          <div role="status" className="min-h-5" id="learn-onboarding-notice">
            {notice ? (
              <div className="flex flex-wrap items-center gap-3">
                <p
                  className="m-0 text-sm font-medium text-destructive"
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
    </FlowFrame>
  );
}
