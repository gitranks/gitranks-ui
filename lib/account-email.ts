const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * A session's email as the API is told it, beside the login: trimmed, and only when it has an address's shape (at most
 * 254 characters); undefined otherwise.
 */
export function accountEmailOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const email = value.trim();
  return email && email.length <= 254 && EMAIL.test(email) ? email : undefined;
}
