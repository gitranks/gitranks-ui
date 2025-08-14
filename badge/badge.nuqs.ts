'use client';

import { createParser, parseAsString, parseAsStringEnum } from 'nuqs';

import { BadgeCornerStyle, BadgeContext, BadgeMeta, BadgeType, BadgeRanking } from '@/types/badge.types';

import { LABEL_BG, VALUE_BG } from './templates/inline/inline.consts';

const parseAsHexColor = createParser<string>({
  parse(v) {
    return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(v) ? v : null;
  },
  serialize(v) {
    return v;
  },
});

// 2) Build the nuqs parsers map
export const BadgeNuqsSchema = {
  ranking: parseAsStringEnum(Object.values(BadgeRanking)).withDefault(BadgeRanking.s),
  context: parseAsStringEnum(Object.values(BadgeContext)).withDefault(BadgeContext.Global),
  type: parseAsStringEnum(Object.values(BadgeType)).withDefault(BadgeType.Position),
  meta: parseAsStringEnum(Object.values(BadgeMeta)).withDefault(BadgeMeta.None),
  label: parseAsString.withDefault('Stars Rank').withOptions({ clearOnDefault: false }),
  cornerStyle: parseAsStringEnum(Object.values(BadgeCornerStyle)).withDefault(BadgeCornerStyle.Rounded),
  labelBgColor: parseAsHexColor.withDefault(LABEL_BG),
  valueBgColor: parseAsHexColor.withDefault(VALUE_BG),
} as const;
