/**
 * A list's row as the API answers it once issue details are hidden: a masked row carries `masked` and may leave the
 * fields that name its issue null. Each list's read strips those fields from a masked row before anything reaches a
 * client component, a data attribute or a JSON route, whatever the API sent, and keys the row by its mask id.
 */
export type MaskedAnswer<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

/** A masked row's key, set apart from node ids so nothing sends it to the API as one. */
export const MASK_KEY = 'mask:';

/** The key of a masked row: its mask id, marked. */
export const maskKeyOf = (id: string): string => `${MASK_KEY}${id}`;

/** Whether a key is a masked row's. */
export const isMaskKey = (key: string): boolean => key.startsWith(MASK_KEY);
