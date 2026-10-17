/** The stored name `name` refers to: an exact match first, then one that differs only in case. */
export function matchRouteName(names: string[], name: string): string | undefined {
  const lower = name.toLowerCase();

  return names.find((n) => n === name) ?? names.find((n) => n.toLowerCase() === lower);
}
