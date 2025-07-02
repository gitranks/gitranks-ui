export function formatNumberShort(value?: number): string {
  const trim = (s: string) => s.replace(/\.0$/, '');

  if (value === undefined || value === null || isNaN(value)) {
    return '';
  }

  if (value >= 1_000_000_000) {
    return `${trim((value / 1_000_000_000).toFixed(1))}B`;
  }

  if (value >= 1_000_000) {
    return `${trim((value / 1_000_000).toFixed(1))}M`;
  }

  if (value >= 1_000) {
    return `${trim((value / 1_000).toFixed(1))}K`;
  }

  return value.toString();
}
