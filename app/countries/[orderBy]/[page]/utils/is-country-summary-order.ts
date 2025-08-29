import { CountrySummaryOrder } from '@/types/generated/graphql';

const ORDER_BY_SET = new Set<string>(Object.values(CountrySummaryOrder));

export function isCountrySummaryOrder(v: unknown): v is CountrySummaryOrder {
  return typeof v === 'string' && ORDER_BY_SET.has(v);
}
