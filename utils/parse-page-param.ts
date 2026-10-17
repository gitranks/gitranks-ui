/** `"3"` → 3. Anything but a positive integer without leading zeros (`"0"`, `"01"`, `"2x"`) → `null`. */
export function parsePageParam(page: string | undefined): number | null {
  if (!page || !/^[1-9]\d*$/.test(page)) {
    return null;
  }

  const value = Number(page);

  return Number.isSafeInteger(value) ? value : null;
}
