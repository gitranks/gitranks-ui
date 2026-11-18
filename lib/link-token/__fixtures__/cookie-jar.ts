/** A stand-in for `cookies()` from `next/headers`: what a request brought, and what the response sets. */
export function cookieJar() {
  const values = new Map<string, string>();
  const sets: { name: string; value: string; options: Record<string, unknown> }[] = [];
  return {
    values,
    sets,
    store: {
      get: (name: string) => (values.has(name) ? { name, value: values.get(name) as string } : undefined),
      set: (name: string, value: string, options: Record<string, unknown> = {}) => {
        sets.push({ name, value, options });
        values.set(name, value);
      },
    },
    clear() {
      values.clear();
      sets.length = 0;
    },
  };
}
