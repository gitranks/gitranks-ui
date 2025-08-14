import Link from 'next/link';
import { memo, useMemo } from 'react';
import { z } from 'zod';

import { BadgeV2ZodSchema } from '@/badge/badge.zod';
import { INLINE_BADGE_HEIGHT } from '@/badge/templates/inline/inline.consts';

// Naming convention
// /public/badges/
//   <ranking>__<context>__<type>__<meta>__<corner>[ _lb-<hex> ][ _vb-<hex> ].svg
//
// Examples:
// s__global__position__none__rounded.svg
// c__country__percentile__none__squared_lb-000000_vb-ffffff.svg
// f__org__tier__top__rounded_lb-1a2b3c.svg

type BadgeV2Input = z.input<typeof BadgeV2ZodSchema>; // what callers pass in
type BadgeV2Output = z.output<typeof BadgeV2ZodSchema>; // after defaults applied

const toSlug = (v: string) => v.toLowerCase();
const stripHash = (hex?: string) => (hex ? hex.replace('#', '').toLowerCase() : undefined);

function buildBadgeFilename(p: BadgeV2Output): string {
  const segments = [toSlug(p.ranking), toSlug(p.context), toSlug(p.type), toSlug(p.meta), toSlug(p.cornerStyle)];
  const extras: string[] = [];
  const lb = stripHash(p.labelBgColor);
  const vb = stripHash(p.valueBgColor);
  if (lb) extras.push(`lb-${lb}`);
  if (vb) extras.push(`vb-${vb}`);
  return `${segments.join('__')}${extras.length ? `_${extras.join('_')}` : ''}.svg`;
}

export type BadgeExampleProps = Partial<BadgeV2Input>;

function BadgeExample(props: Readonly<BadgeExampleProps>) {
  const parsed = useMemo(() => BadgeV2ZodSchema.parse(props), [props]);
  const src = useMemo(() => `/badges/${buildBadgeFilename(parsed)}`, [parsed]);

  const builderUrl = useMemo(() => {
    const q = new URLSearchParams();

    Object.entries(parsed).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        q.set(String(k), String(v));
      }
    });

    return `/badge/builder?${q.toString()}`;
  }, [parsed]);

  return (
    <Link href={builderUrl} aria-label={parsed.label ?? 'Open badge builder'}>
      <img src={src} alt={parsed.label ?? 'Badge example'} height={INLINE_BADGE_HEIGHT} decoding="async" />
    </Link>
  );
}

export default memo(BadgeExample);
