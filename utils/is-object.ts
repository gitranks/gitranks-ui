export function isObject<T extends object>(value: unknown): value is T {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
