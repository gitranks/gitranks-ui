const MINUTE = 60_000;

/** "13 h 20 min", "5 h", "20 min"; never less than "1 min". Short words that read in any language. */
export function formatTimeLeft(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) {
    return `${rest} min`;
  }

  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export const timeLeftUntil = (iso: string, now = Date.now()) => formatTimeLeft(new Date(iso).getTime() - now);
