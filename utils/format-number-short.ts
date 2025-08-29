// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatNumberShort(v?: any): string {
  return typeof v === 'number'
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
    : '';
}
