import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/**
 * The GitHub grant's token is sealed before its account row is written, and the GitRanks API opens it. Both ends read
 * the same key ring, so the format is fixed:
 *
 * - The ring, `CONTRIBUTE_GRANT_SEAL_KEYS`: `<keyId>:<key>[,<keyId>:<key>...]`. A key id is 1 to 16 of
 *   `A-Z a-z 0-9 _ -`; a key is 32 random bytes in base64 or base64url (`openssl rand -base64 32`). The **last** entry
 *   seals; every entry opens what was sealed under its id, so a rotation appends a key.
 * - A sealed token: `v1.<keyId>.<iv>.<ciphertext>.<tag>`, each part base64url without padding. AES-256-GCM, a 12-byte
 *   random iv, a 16-byte tag, and the associated data `github-contribute:<providerAccountId>` (GitHub's numeric user
 *   id, as the row stores it), so a sealed token copied onto another user's row does not open.
 *
 * The token is never logged; an error names the variable, never a value.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_ID = /^[A-Za-z0-9_-]{1,16}$/;
/** A ring key: standard base64 or base64url. */
const KEY_BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
/** An OAuth token is 40 to a few hundred characters; anything far longer is not one of ours. */
const MAX_SEALED_LENGTH = 4_096;

export const SEAL_KEYS_ENV = 'CONTRIBUTE_GRANT_SEAL_KEYS';

/** `sealingId` is the last entry's id. */
export type SealKeyRing = { sealingId: string; keys: ReadonlyMap<string, Buffer> };
export type OpenedGrant = { token: string; keyId: string };

/** The associated data a grant token is sealed under. */
export const grantAadOf = (providerAccountId: string): string => `${CONTRIBUTE_PROVIDER}:${providerAccountId}`;

/**
 * The key ring in `value` (the variable's text); null when it is unset or blank. A malformed ring throws, naming the
 * variable only.
 */
export function sealKeyRingOf(value: string | undefined): SealKeyRing | null {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) return null;

  const keys = new Map<string, Buffer>();
  let sealingId = '';
  entries.forEach((entry, index) => {
    const at = entry.indexOf(':');
    const id = at > 0 ? entry.slice(0, at) : '';
    const text = at > 0 ? entry.slice(at + 1) : '';
    if (!KEY_ID.test(id)) throw new Error(`${SEAL_KEYS_ENV} entry ${index + 1}: the id is not [A-Za-z0-9_-]{1,16}`);
    if (keys.has(id)) throw new Error(`${SEAL_KEYS_ENV} entry ${index + 1}: the id ${id} is repeated`);
    const key = KEY_BASE64.test(text)
      ? Buffer.from(text, text.includes('-') || text.includes('_') ? 'base64url' : 'base64')
      : null;
    if (!key || key.length !== KEY_BYTES) {
      throw new Error(`${SEAL_KEYS_ENV} entry ${index + 1} (${id}): the key is not base64 of ${KEY_BYTES} bytes`);
    }
    keys.set(id, key);
    sealingId = id;
  });
  return { sealingId, keys };
}

/** Seals `token` with the ring's sealing key (its last entry) under `aad`. */
export function sealGrant(token: string, aad: string, ring: SealKeyRing): string {
  const key = ring.keys.get(ring.sealingId) as Buffer;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const body = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [VERSION, ring.sealingId, iv, body, cipher.getAuthTag()]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

/**
 * The token sealed in `sealed` under `aad`, and the id of the key that opened it; null for anything else: another
 * format, a key the ring no longer holds, another row's associated data, a changed byte. This app only seals; opening
 * is here so the format can be checked from both sides.
 */
export function openGrant(sealed: unknown, aad: string, ring: SealKeyRing): OpenedGrant | null {
  if (typeof sealed !== 'string' || sealed.length > MAX_SEALED_LENGTH) return null;
  const parts = sealed.split('.');
  if (parts.length !== 5) return null;
  const [version, keyId, ivText, bodyText, tagText] = parts;
  const key = ring.keys.get(keyId);
  if (version !== VERSION || !key || ![ivText, bodyText, tagText].every((part) => BASE64URL.test(part))) return null;

  const iv = Buffer.from(ivText, 'base64url');
  const tag = Buffer.from(tagText, 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(tag);
    const token = Buffer.concat([decipher.update(Buffer.from(bodyText, 'base64url')), decipher.final()]).toString(
      'utf8',
    );
    return token ? { token, keyId } : null;
  } catch {
    return null;
  }
}
