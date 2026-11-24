import { type ContributeActionResult, contributeErrorOf } from './errors';

/**
 * A list read with its masked rows: the operation that adds `masked` to today's fields first, and today's operation
 * when the API does not know the new field yet (its "Cannot query field" answer). Any other failure is the read's own,
 * as today's operation would have failed: an outage is never taken for an API without the field.
 */
export async function readWithMasked<T>(withMasked: () => Promise<T>, today: () => Promise<T>): Promise<T> {
  try {
    return await withMasked();
  } catch (failure) {
    if (contributeErrorOf(failure).error !== 'NOT_AVAILABLE_YET') throw failure;
  }
  return today();
}

/** `readWithMasked` for a server action's read, which answers its failure instead of throwing it. */
export async function runWithMasked<T>(
  withMasked: () => Promise<ContributeActionResult<T>>,
  today: () => Promise<ContributeActionResult<T>>,
): Promise<ContributeActionResult<T>> {
  const read = await withMasked();
  if (read.ok || read.error !== 'NOT_AVAILABLE_YET') return read;
  return today();
}
