/** Why the GitHub grant's callback did not save the grant, read from its `?grant=` return. */
export type GrantRefusal = 'refused' | 'unavailable';

export const grantRefusalOf = (value: string | string[] | undefined): GrantRefusal | undefined =>
  value === 'refused' || value === 'unavailable' ? value : undefined;
