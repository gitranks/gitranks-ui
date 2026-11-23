'use client';

import { useId } from 'react';

import { CodeBox } from './code-lines';
import { type HighlightedCode, highlightedOf } from '@/lib/learn/code-tokens';
import { languageNameOf } from '@/lib/learn/learn-question';
import { useExampleLanguage } from '@/lib/learn/use-example-language';
import { cn } from '@/lib/utils';

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

/**
 * An example of a lesson, in every language of its course: one tab for each when there are several, the code of the
 * person's language shown in place. A course of one language shows its name instead of tabs.
 */
export function ExampleBlock({
  codes,
  main,
  label = 'Example',
}: {
  codes: readonly HighlightedCode[];
  /** The learner's main language, when the page knows it. */
  main?: string | null;
  label?: string;
}) {
  const languages = codes.map((code) => code.language);
  const [language, pick] = useExampleLanguage(languages, main);
  const shown = highlightedOf(codes, language);
  const panelId = useId();
  if (!shown) return null;
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2" data-block="example">
      {codes.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={EYEBROW}>{label}</span>
          <div role="tablist" aria-label={`${label}: language`} className="flex flex-wrap gap-1">
            {codes.map((code) => {
              const on = code.language === shown.language;
              return (
                <button
                  key={code.language}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={panelId}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(code.language)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                    event.preventDefault();
                    const at = languages.indexOf(code.language) + (event.key === 'ArrowRight' ? 1 : -1);
                    const next = languages[(at + languages.length) % languages.length];
                    pick(next);
                    event.currentTarget.parentElement
                      ?.querySelector<HTMLButtonElement>(`[data-language="${next}"]`)
                      ?.focus();
                  }}
                  data-language={code.language}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    on
                      ? 'bg-brand-soft font-semibold text-brand-soft-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {languageNameOf(code.language)}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <span className={EYEBROW}>
          {label} · {languageNameOf(shown.language)}
        </span>
      )}
      <div id={panelId} role={codes.length > 1 ? 'tabpanel' : undefined}>
        <CodeBox code={shown} />
      </div>
    </figure>
  );
}
