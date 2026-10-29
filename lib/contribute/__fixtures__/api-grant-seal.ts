import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * A copy of the API's sealing, kept as the other end of the format: `grant-seal.spec.ts` checks that what this app
 * seals opens here, and what this seals opens in the app. Change it only together with the API.
 */
const CONTRIBUTE_GRANT_PROVIDER = 'github-contribute';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_ID = /^[A-Za-z0-9_-]{1,16}$/;
const KEY_BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_SEALED_LENGTH = 4_096;

export const SEAL_KEYS_ENV = 'CONTRIBUTE_GRANT_SEAL_KEYS';

export type SealKeyRing = { sealingId: string; keys: ReadonlyMap<string, Buffer> };
export type OpenedGrant = { token: string; keyId: string };

export const grantAadOf = (providerAccountId: string): string => `${CONTRIBUTE_GRANT_PROVIDER}:${providerAccountId}`;

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
