'use client';

import { Briefcase, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CompanyCards, PlanRows, TEXT_LINK } from './home-parts';
import { CompanyLogo } from '@/components/interviews/company-logo';
import { buttonVariants } from '@/components/ui/button';
import { companiesLineOf, planRowNameOf, planSizeOf } from '@/lib/interviews/home';
import {
  chooseHomeTag,
  dropHomeTag,
  HOME_POSITION_HINT_ATTRIBUTE,
  type HomeChosen,
  type HomeSuggestion,
  type HomeTag,
  homeAddressQueryOf,
  homeChosenOfAddress,
  homeFieldLineOf,
  homeListOf,
  homeNothingOf,
  homeQueryOf,
  homeSuggestionsOf,
  homeTagKeyOf,
  NOTHING_CHOSEN,
  suggestionLineOf,
} from '@/lib/interviews/home-search';
import { interviewCompanyPath, interviewPlanPath } from '@/lib/interviews/paths';
import type { InterviewsHome } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/** The two kinds of tag, each in its own colour: a company blue, a position rose, in both themes. */
const TAG_LOOK: Record<HomeTag['kind'], string> = {
  company:
    'bg-[oklch(0.95_0.03_250)] text-[oklch(0.42_0.12_250)] dark:bg-[oklch(0.32_0.07_250)] dark:text-[oklch(0.9_0.05_250)]',
  position:
    'bg-[oklch(0.95_0.035_20)] text-[oklch(0.45_0.13_20)] dark:bg-[oklch(0.32_0.07_20)] dark:text-[oklch(0.9_0.05_20)]',
};
const TAG = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full py-0.5 text-xs font-semibold';
/** The list's section: hidden in its place while a position the address keeps is not read yet (4s at the most). */
const LIST_SECTION =
  'flex flex-col gap-4 [html[data-interviews-position]_&]:invisible [html[data-interviews-position]_&]:animate-build-reveal';
const FLOAT =
  'absolute top-[calc(100%+6px)] right-0 left-0 z-10 rounded-lg border bg-card shadow-[0_10px_30px_-10px_color-mix(in_oklch,var(--foreground)_35%,transparent)]';

/** A chip in the field: the tag's name and the way to take it out. */
function Chip({ tag, onDrop }: Readonly<{ tag: HomeTag; onDrop: () => void }>) {
  const name = tag.kind === 'company' ? tag.company.name : tag.position.name;
  return (
    <span
      className={cn(TAG, TAG_LOOK[tag.kind], tag.kind === 'company' ? 'pr-1 pl-1' : 'pr-1 pl-2')}
      data-chip={tag.kind}
    >
      {tag.kind === 'company' ? <CompanyLogo company={tag.company} size={16} /> : null}
      <span data-chip-name="">{name}</span>
      <button
        type="button"
        onClick={onDrop}
        aria-label={`Remove ${name}`}
        className="inline-flex size-4 items-center justify-center rounded-full hover:bg-foreground/10"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/** One suggestion: the logo or the position's mark, the name with the typed letters in bold, and what it holds. */
function SuggestionRow({ suggestion }: Readonly<{ suggestion: HomeSuggestion }>) {
  const { tag, name } = suggestion;
  return (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        {tag.kind === 'company' ? (
          <CompanyLogo company={tag.company} size={20} />
        ) : (
          <span className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            <Briefcase className="size-4" aria-hidden="true" />
          </span>
        )}
        <span className={cn(TAG, 'px-2', TAG_LOOK[tag.kind])} data-suggestion-name="">
          <span>
            {name.before}
            {name.mark ? <b>{name.mark}</b> : null}
            {name.after}
          </span>
        </span>
      </span>
      <span className="text-right text-xs text-muted-foreground" data-suggestion-line="">
        {suggestionLineOf(suggestion)}
      </span>
    </>
  );
}

export type HomeSearchProps = {
  home: InterviewsHome;
  /** Where the search stands: the landing's top, or the person's home, inside the companies' section. */
  place: 'landing' | 'mine';
  /** The landing's top, above the field. */
  intro?: ReactNode;
  /** The companies the person's plans prepare for: their cards carry "Your plan". */
  mine?: ReadonlySet<string>;
};

/**
 * The search of Interviews home and the list under it. Typing offers companies and positions; the list changes only
 * when a tag is chosen: a position (with a company beside it, or not) turns it into the plans they keep, and the
 * address keeps the position. A company chosen alone opens its page. With nothing chosen the list is the companies,
 * the first twelve, then "All N companies" in place.
 */
export function HomeSearch({ home, place, intro, mine }: Readonly<HomeSearchProps>) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<HomeChosen>(NOTHING_CHOSEN);
  const [open, setOpen] = useState(false);
  const [lit, setLit] = useState(0);
  const [all, setAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const read = useRef(false);
  const id = useId();
  const listId = `${id}-suggestions`;
  const inputId = `${id}-field`;

  // The address keeps the chosen position. It is read before the first paint after the page comes alive, and the
  // list, hidden in its place until then when the address has a position, shows already turned into its plans.
  useLayoutEffect(() => {
    const fromAddress = homeChosenOfAddress(home, window.location.search);
    if (fromAddress.position) setChosen(fromAddress);
    document.documentElement.removeAttribute(HOME_POSITION_HINT_ATTRIBUTE);
  }, [home]);

  // Then each change of the chips is written to it; the first pass has nothing new to write.
  useEffect(() => {
    if (!read.current) {
      read.current = true;
      return;
    }
    const address = `${window.location.pathname}${homeAddressQueryOf(chosen)}${window.location.hash}`;
    if (address !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', address);
    }
  }, [chosen]);

  const suggestions = useMemo(() => homeSuggestionsOf(home, query, chosen), [home, query, chosen]);
  const line = useMemo(() => homeFieldLineOf(home, query, chosen), [home, query, chosen]);
  const list = useMemo(() => homeListOf(home, chosen, all), [home, chosen, all]);
  const typed = homeQueryOf(query);
  const showing = open && !!typed;
  const litIndex = Math.min(lit, Math.max(suggestions.length - 1, 0));

  const free = (
    <p className="m-0 text-xs text-muted-foreground">Free. Your interview plans are not publicly visible.</p>
  );
  // With no company to find, the landing keeps its top and nothing else: a section with nothing in it is not shown.
  if (!home.companies.length) {
    return place === 'landing' ? (
      <div className="flex flex-col gap-4">
        {intro}
        {free}
      </div>
    ) : null;
  }

  const choose = (tag: HomeTag) => {
    const next = chooseHomeTag(chosen, tag);
    setQuery('');
    setLit(0);
    if (next.open) {
      setOpen(false);
      router.push(interviewCompanyPath(next.open.slug));
      return;
    }
    setChosen(next.chosen);
    input.current?.focus();
  };

  const clear = () => {
    setQuery('');
    setChosen(NOTHING_CHOSEN);
    setAll(false);
    setLit(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setLit((litIndex + step + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      if (!showing || !suggestions.length) return;
      event.preventDefault();
      choose(suggestions[litIndex].tag);
    } else if (event.key === 'Escape') {
      if (typed) setQuery('');
      else setOpen(false);
    } else if (event.key === 'Backspace' && !query) {
      if (chosen.company) setChosen(dropHomeTag(chosen, 'company'));
      else if (chosen.position) setChosen(dropHomeTag(chosen, 'position'));
    }
  };

  const hasChips = !!chosen.company || !!chosen.position;
  const field = (
    <div className="flex flex-col gap-3" data-interviews-search="">
      <div className="relative">
        {/* The input's label: pressing anywhere in the box but a chip's button puts the cursor in the field. */}
        <label
          htmlFor={inputId}
          className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {chosen.company ? (
            <Chip
              tag={{ kind: 'company', company: chosen.company }}
              onDrop={() => setChosen(dropHomeTag(chosen, 'company'))}
            />
          ) : null}
          {chosen.position ? (
            <Chip
              tag={{ kind: 'position', position: chosen.position }}
              onDrop={() => setChosen(dropHomeTag(chosen, 'position'))}
            />
          ) : null}
          <input
            ref={input}
            id={inputId}
            type="text"
            role="combobox"
            aria-label="Find a company or a position"
            aria-expanded={showing && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showing && suggestions.length ? `${id}-option-${litIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={hasChips ? '' : 'Find a company or a position'}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLit(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="h-8 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {line ? (
            <span
              className="ml-auto whitespace-nowrap text-xs text-muted-foreground"
              aria-live="polite"
              data-field-line=""
            >
              {line}
            </span>
          ) : null}
        </label>
        {showing && suggestions.length ? (
          <div
            id={listId}
            role="listbox"
            aria-label="Companies and positions"
            className={cn(FLOAT, 'flex flex-col p-1')}
          >
            {suggestions.map((suggestion, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: the field above takes the keys (arrows and Enter) for the list.
              <div
                key={homeTagKeyOf(suggestion.tag)}
                id={`${id}-option-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={index === litIndex}
                data-suggestion={suggestion.tag.kind}
                // The field keeps the focus, so the list stays open under the press.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setLit(index)}
                onClick={() => choose(suggestion.tag)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-accent',
                  index === litIndex && 'bg-accent/60',
                )}
              >
                <SuggestionRow suggestion={suggestion} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {typed && !suggestions.length ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4" data-search-nothing="">
          <p className="m-0 text-sm">{homeNothingOf(home, query, chosen)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clear}
              className={cn(buttonVariants({ variant: 'outline' }), 'font-semibold')}
            >
              Show all companies
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const titleId = `${id}-list-title`;
  const title = list.kind === 'plans' ? list.title : 'Companies';
  const listed =
    list.kind === 'companies' ? (
      <>
        <CompanyCards companies={list.companies} mine={mine} />
        {list.hidden ? (
          <button type="button" onClick={() => setAll(true)} className={cn('self-start text-sm', TEXT_LINK)}>
            All {home.companies.length} companies
          </button>
        ) : null}
      </>
    ) : (
      <>
        {list.plans.length ? (
          <PlanRows
            rows={list.plans.map((plan) => ({
              key: `${plan.company.slug}/${plan.slug}`,
              company: plan.company,
              name: planRowNameOf(plan, { levelNames: true }),
              right: planSizeOf(plan),
              href: interviewPlanPath(plan.company.slug, plan.slug),
            }))}
          />
        ) : null}
        <button type="button" onClick={clear} className={cn('self-start text-sm', TEXT_LINK)}>
          Show all companies
        </button>
      </>
    );

  if (place === 'mine') {
    return (
      <section className={LIST_SECTION} aria-labelledby={titleId} data-home-list={list.kind}>
        <h2 id={titleId} className="m-0 text-xl font-bold tracking-tight">
          {title}
        </h2>
        {field}
        {listed}
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {intro}
        {field}
        {free}
      </div>
      <section className={LIST_SECTION} aria-labelledby={titleId} data-home-list={list.kind}>
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="m-0 text-xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="m-0 text-sm text-muted-foreground">
            {list.kind === 'plans'
              ? 'One plan for each company and level that public sources describe.'
              : companiesLineOf(home.companies.length)}
          </p>
        </div>
        {listed}
      </section>
    </>
  );
}
