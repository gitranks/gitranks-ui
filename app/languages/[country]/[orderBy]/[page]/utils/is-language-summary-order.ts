import { LanguageSummaryOrder } from '@/types/generated/graphql';

const ORDER_BY_SET = new Set<string>(Object.values(LanguageSummaryOrder));

export function isLanguageSummaryOrder(v: unknown): v is LanguageSummaryOrder {
  return typeof v === 'string' && ORDER_BY_SET.has(v.toUpperCase());
}
