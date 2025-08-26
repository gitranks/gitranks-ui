export function formatNumberShort(v?: number): string {
  return typeof v === 'number'
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
    : '';
}
