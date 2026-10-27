'use client';

import { ChevronDown } from 'lucide-react';
import { type ReactNode, type RefObject, useEffect, useId, useState } from 'react';

import { useDebounced } from '../hooks/use-debounced';
import {
  badgeAlt,
  byChoices,
  type Choice,
  CUSTOM_START,
  extraChoices,
  isAvailable,
  languageChoices,
  languageOf,
  orderChoices,
  paramsOf,
  rankAmongChoices,
  schemeChoices,
  scopeChoices,
  valueChoices,
} from '../utils/badge-options';
import type { Style } from '../utils/builder-state';
import { BadgeImage } from './badge-image';
import { type BadgeDefinition, findBadge } from '@/badge/v3/catalogue';
import type { EntityFacts } from '@/badge/v3/facts';
import { LABEL_MAX_LENGTH } from '@/badge/v3/params';
import { shieldContent } from '@/badge/v3/shields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Style changes reach the previews this long after the last one. */
export const PREVIEW_DEBOUNCE_MS = 500;

type StyleStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  facts: EntityFacts;
  badge: BadgeDefinition;
  style: Style;
  now: Date;
  onStyle: (badge: BadgeDefinition, style: Style) => void;
  onDone: () => void;
};

/** Options that may stop applying after another change; dropped until the badge is available again. */
const SETTLE_KEYS = ['scope', 'language', 'order', 'extra'] as const;

/** `#abc` as `#aabbcc`, which a colour input needs. */
const longHex = (hex: string) =>
  /^#[0-9a-f]{3}$/i.test(hex) ? `#${[...hex.slice(1)].map((c) => c + c).join('')}`.toLowerCase() : hex.toLowerCase();

/** Step 3: a light and a dark preview, the badge's options, Extra, Colors and the collapsed Advanced section. */
export function StyleStep({ headingRef, facts, badge, style, now, onStyle, onDone }: Readonly<StyleStepProps>) {
  const params = paramsOf(badge, style);
  const shownStyle = useDebounced(style, PREVIEW_DEBOUNCE_MS);
  const shownBadge = useDebounced(badge, PREVIEW_DEBOUNCE_MS);
  const ids = useId();

  /** Applies a change, then drops options the change made unavailable. */
  const update = (change: Style, nextBadge: BadgeDefinition = badge) => {
    const next: Style = { ...style, ...change };
    for (const key of Object.keys(change) as (keyof Style)[]) {
      if (change[key] === undefined) delete next[key];
    }
    for (const key of SETTLE_KEYS) {
      if (isAvailable(facts, nextBadge, next, now)) break;
      if (!(key in change)) delete next[key];
    }
    onStyle(nextBadge, next);
  };

  const rankAmong = rankAmongChoices(facts, badge, now);
  const bys = byChoices(facts, badge, style, now);
  const scopes = scopeChoices(facts, badge, style, now);
  const languages = languageChoices(facts, badge);
  const values = valueChoices(facts, badge);
  const orders = orderChoices(facts, badge, style, now);
  const extras = params ? extraChoices(facts, badge, params, now) : [];
  const schemes = schemeChoices(badge);
  const scheme = params?.scheme ?? 'auto';
  const extra = params?.extra && extras.some(({ value }) => value === params.extra) ? params.extra : 'none';
  const defaultLabel =
    badge.format === 'shield' && params
      ? (shieldContent(facts, badge, { ...params, label: null }, now)?.label ?? '')
      : '';

  const [advancedOpen, setAdvancedOpen] = useState(!!style.label || style.logo === '0');
  const [label, setLabel] = useState(style.label ?? '');
  // A new badge starts from its own label.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the badge changes, not on every keystroke
  useEffect(() => {
    setLabel(style.label ?? '');
  }, [badge.id]);

  return (
    <section className="flex flex-col gap-5" aria-labelledby={`${ids}-heading`}>
      <h2 id={`${ids}-heading`} ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        Style it
      </h2>

      <div className={cn('grid gap-2', badge.format !== 'chart' && 'sm:grid-cols-2')}>
        {(['light', 'dark'] as const).map((theme) => (
          <figure
            key={theme}
            className={cn(
              'flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border p-4',
              theme === 'light'
                ? 'border-[#d1d9e0] bg-white text-[#59636e]'
                : 'border-[#30363d] bg-[#0d1117] text-[#9198a1]',
            )}
          >
            <BadgeImage
              key={`${shownBadge.id}:${theme}`}
              facts={facts}
              badge={shownBadge}
              style={shownStyle}
              theme={theme}
              alt={badgeAlt(facts, shownBadge, shownStyle, now)}
            />
            <figcaption className="text-xs">On a {theme} page</figcaption>
          </figure>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rankAmong.length > 0 && (
          <Segmented
            label="Rank among"
            choices={rankAmong}
            value={badge.id}
            onChange={(id) => {
              const next = findBadge('repo', id);
              if (next) update({ extra: undefined }, next);
            }}
          />
        )}
        {bys.length > 1 && (
          <Segmented label="Ranking" choices={bys} value={params?.by ?? 'stars'} onChange={(by) => update({ by })} />
        )}
        {scopes.length > 0 && (
          <Segmented
            label="Rank among"
            choices={scopes}
            value={params?.scope ?? 'global'}
            onChange={(scope) => update({ scope })}
          />
        )}
        {languages.length > 1 && (
          <SelectField
            label="Language"
            choices={languages}
            value={languageOf(facts, style.language) ?? languages[0].value}
            onChange={(language) => update({ language: language === languages[0].value ? undefined : language })}
          />
        )}
        {values.length > 1 && (
          <SelectField
            label="Value"
            choices={values}
            value={params?.value ?? '12mo'}
            onChange={(value) => update({ value })}
          />
        )}
        {badge.format === 'shield' && (
          <SelectField
            label="Extra"
            choices={[...extras, { value: 'none', name: 'None' }]}
            value={extra}
            onChange={(value) => update({ extra: value })}
          />
        )}
        {orders.length > 0 && (
          <SelectField
            label="Order"
            choices={orders}
            value={params?.order ?? 'popular'}
            onChange={(order) => update({ order })}
          />
        )}
        {badge.options.includes('rows') && (
          <SelectField
            label="Rows"
            choices={['1', '2', '3', '4', '5'].map((rows) => ({ value: rows, name: rows }))}
            value={String(params?.rows ?? 3)}
            onChange={(rows) => update({ rows })}
          />
        )}
        {badge.options.includes('tiers') && (
          <Switch
            label="Show tier insignia"
            checked={params?.tiers ?? true}
            onChange={(on) => update({ tiers: on ? '1' : '0' })}
          />
        )}
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium">Colors</legend>
        <div className="flex flex-wrap gap-2">
          {schemes.map((choice) => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={scheme === choice.value}
              onClick={() =>
                choice.value === 'custom'
                  ? update({
                      scheme: 'custom',
                      left: style.left ?? CUSTOM_START.left,
                      right: style.right ?? CUSTOM_START.right,
                    })
                  : update({ scheme: choice.value, left: undefined, right: undefined })
              }
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring',
                scheme === choice.value && 'border-primary ring-1 ring-primary',
              )}
            >
              {choice.swatches.map((swatch) => (
                <span
                  key={swatch}
                  aria-hidden="true"
                  className="size-3.5 rounded-sm border border-black/10"
                  style={{ background: swatch }}
                />
              ))}
              {choice.value === 'custom' ? 'Custom…' : choice.name}
              {choice.hint && <span className="font-normal text-muted-foreground">· {choice.hint}</span>}
            </button>
          ))}
        </div>
        {scheme === 'custom' && (
          <div className="flex flex-wrap gap-4 pt-1">
            {(['left', 'right'] as const).map((side) => {
              const value = longHex(params?.colors?.[side] ?? CUSTOM_START[side]);
              return (
                <label key={side} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="color"
                    value={value}
                    onChange={(event) => update({ [side]: event.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-md border bg-card p-1"
                  />
                  {side === 'left' ? 'Label color' : 'Value color'}
                  <code className="text-xs text-muted-foreground">{value}</code>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="rounded-lg border">
        <button
          type="button"
          aria-expanded={advancedOpen}
          aria-controls={`${ids}-advanced`}
          onClick={() => setAdvancedOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span>
            Advanced
            <span className="font-normal text-muted-foreground">
              {' '}
              · {badge.format === 'shield' ? 'label text, logo' : 'logo'}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')} />
        </button>
        <div id={`${ids}-advanced`} hidden={!advancedOpen} className="border-t px-3 py-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {badge.format === 'shield' && (
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor={`${ids}-label`} className="text-sm font-medium">
                  Label text
                </label>
                <Input
                  id={`${ids}-label`}
                  value={label}
                  maxLength={LABEL_MAX_LENGTH}
                  placeholder={defaultLabel}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    update({ label: event.target.value.trim() || undefined });
                  }}
                  className="h-9"
                />
              </div>
            )}
            <Switch
              label="Show logo"
              checked={params?.logo ?? true}
              onChange={(on) => update({ logo: on ? undefined : '0' })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="lg" onClick={onDone} className="w-full sm:w-auto">
          Get the code
        </Button>
      </div>
    </section>
  );
}

function Segmented<T extends string>({
  label,
  choices,
  value,
  onChange,
}: Readonly<{ label: string; choices: Choice<T>[]; value: string; onChange: (value: T) => void }>) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-sm font-medium">{label}</legend>
      <div className="flex w-fit max-w-full flex-wrap overflow-hidden rounded-md border">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            className={cn(
              'min-h-9 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              value === choice.value ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
            )}
          >
            {choice.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField<T extends string>({
  label,
  choices,
  value,
  onChange,
}: Readonly<{ label: string; choices: Choice<T>[]; value: string; onChange: (value: T) => void }>) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.sample ? `${choice.name} (${choice.sample})` : choice.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: Readonly<{ label: ReactNode; checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}
