/** The longest id of a build, a run or a question the API is asked about. */
const ID_MAX_LENGTH = 100;

/** Whether a value can be the id of a build, a test's run or a test's question: asked of the API only then. */
export const isBuildId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= ID_MAX_LENGTH && /^[A-Za-z0-9_-]+$/.test(value);
