/** A module whose every export is a no-op: the loaders and server actions a static screen never calls. */
export const inert = () =>
  new Proxy(
    {},
    {
      get: (_, key) => (key === 'then' || key === '__esModule' ? undefined : async () => undefined),
      // Vitest asks the mock whether it has an export before reading it.
      has: (_, key) => key !== 'then' && key !== '__esModule',
    },
  );
