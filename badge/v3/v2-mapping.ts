import { cutLabel } from './params';

/** The old builder's query names; the v3 builder never writes them. */
export const V2_BUILDER_KEYS = [
  'ranking',
  'type',
  'meta',
  'context',
  'labelBgColor',
  'valueBgColor',
  'cornerStyle',
] as const;

/** The old badge's default colours. */
export const V2_LABEL_BG = '#5c5c5c';
export const V2_VALUE_BG = '#2282c2';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const BY: Record<string, string> = { s: 'stars', c: 'contributions', f: 'followers' };

/** True for an old builder link: one of its query names, or a login in the path. */
export function isV2BuilderRequest(search: URLSearchParams, login?: string | null): boolean {
  return !!login || V2_BUILDER_KEYS.some((key) => search.has(key));
}

/**
 * The v3 builder's query for an old builder link (spec §5.5). `type` decides the badge first; `meta` only adds an
 * extra the badge allows; what cannot be carried is dropped. The old badge had no logo and its own colours, so the
 * redirected visitor first sees the closest match without the mark, in those colours.
 */
export function mapV2BuilderQuery(search: URLSearchParams, login?: string | null): URLSearchParams {
  const type = search.get('type') ?? 'position';
  const meta = search.get('meta') ?? 'none';
  const out = new URLSearchParams();

  out.set('user', login ?? '');

  const badge = type === 'tier' ? 'tier' : 'rank';
  out.set('badge', badge);

  if (badge === 'rank') {
    if (type === 'percentile') {
      out.set('extra', 'top');
    } else if (meta === 'percentile') {
      out.set('extra', 'top');
    } else if (meta === 'monthly-change') {
      out.set('extra', 'month');
    } else if (meta.startsWith('goal-')) {
      out.set('extra', 'goal');
    } else {
      out.set('extra', 'none');
    }
  }

  const by = BY[search.get('ranking') ?? 's'];
  if (by && by !== 'stars') out.set('by', by);
  if (search.get('context') === 'country') out.set('scope', 'country');

  out.set('scheme', 'custom');
  const labelBg = search.get('labelBgColor');
  const valueBg = search.get('valueBgColor');
  const left = labelBg && HEX.test(labelBg) ? labelBg : null;
  const right = valueBg && HEX.test(valueBg) ? valueBg : null;
  if (left || right) {
    out.set('left', left ?? V2_LABEL_BG);
    out.set('right', right ?? V2_VALUE_BG);
  } else {
    out.set('preset', 'classic');
  }

  out.set('logo', '0');

  const label = cutLabel(search.get('label') ?? undefined);
  if (label) out.set('label', label);

  return out;
}
