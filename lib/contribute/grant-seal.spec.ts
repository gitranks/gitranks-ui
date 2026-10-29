import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as api from './__fixtures__/api-grant-seal';
import { grantAadOf, openGrant, SEAL_KEYS_ENV, sealGrant, sealKeyRingOf } from './grant-seal';

const ringOf = (value: string) => sealKeyRingOf(value) as NonNullable<ReturnType<typeof sealKeyRingOf>>;
const apiRingOf = (value: string) => api.sealKeyRingOf(value) as NonNullable<ReturnType<typeof api.sealKeyRingOf>>;

const keyText = () => randomBytes(32).toString('base64');
const TOKEN = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';

/** Sealed by the API's own code, with fixed keys: a known answer this app must open. */
const VECTOR = {
  ring: 'k1:AQgPFh0kKzI5QEdOVVxjanF4f4aNlJuiqbC3vsXM09o=,rot_2:__z59vPw7ern5OHe29jV0s_MycbDwL26t7SxrquopaI',
  aad: 'github-contribute:583231',
  token: 'gho_exampleTokenForTheSealVector0000000',
  sealedRot2: 'v1.rot_2.bX8shiF6BkjmokH4.vdEbLbkrP4CoXfToO6QbDxXsGInOe26hYyEZ2_UbBLPPX__X_Qpn.K8mQvZdfoL4j42Xl2jAPLA',
  sealedK1: 'v1.k1.ICcW34zzBIws4uK1.NJUjuJcduEVrKSbrYj5y3m6XlP5D8slU0BcxvRlS5jgOf1LXee2I.JYFi9u6kxjOmjQKPDnB55A',
};

describe('the grant seal, against the API that opens it', () => {
  it('seals what the API opens, under the same associated data', () => {
    const ring = `k1:${keyText()},k2:${keyText()}`;
    const sealed = sealGrant(TOKEN, grantAadOf('583231'), ringOf(ring));

    expect(api.openGrant(sealed, api.grantAadOf('583231'), apiRingOf(ring))).toEqual({ token: TOKEN, keyId: 'k2' });
  });

  it('opens what the API sealed, and the known answer it sealed', () => {
    const ring = `k1:${keyText()}`;
    const sealed = api.sealGrant(TOKEN, api.grantAadOf('42'), apiRingOf(ring));

    expect(openGrant(sealed, grantAadOf('42'), ringOf(ring))).toEqual({ token: TOKEN, keyId: 'k1' });
    expect(openGrant(VECTOR.sealedRot2, VECTOR.aad, ringOf(VECTOR.ring))).toEqual({
      token: VECTOR.token,
      keyId: 'rot_2',
    });
    expect(openGrant(VECTOR.sealedK1, VECTOR.aad, ringOf(VECTOR.ring))).toEqual({ token: VECTOR.token, keyId: 'k1' });
  });

  it('writes v1.<keyId>.<iv>.<ciphertext>.<tag>: base64url without padding, a 12-byte iv and a 16-byte tag', () => {
    const sealed = sealGrant(TOKEN, grantAadOf('1'), ringOf(`k1:${keyText()}`));
    const [version, keyId, iv, body, tag] = sealed.split('.');

    expect(sealed).toMatch(/^v1\.k1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(sealed).not.toContain('=');
    expect([version, keyId]).toEqual(['v1', 'k1']);
    expect(Buffer.from(iv, 'base64url')).toHaveLength(12);
    expect(Buffer.from(tag, 'base64url')).toHaveLength(16);
    expect(Buffer.from(body, 'base64url')).toHaveLength(TOKEN.length);
    expect(sealed).not.toContain(TOKEN);
  });

  it('binds the token to its account: another account id does not open it', () => {
    const ring = `k1:${keyText()}`;
    const sealed = sealGrant(TOKEN, grantAadOf('583231'), ringOf(ring));

    expect(grantAadOf('583231')).toBe('github-contribute:583231');
    expect(api.openGrant(sealed, api.grantAadOf('583232'), apiRingOf(ring))).toBeNull();
  });

  it('seals with the last key of the ring, which the API opens after a rotation', () => {
    const old = `k1:${keyText()}`;
    const rotated = `${old},k2:${keyText()}`;
    const before = sealGrant(TOKEN, grantAadOf('7'), ringOf(old));
    const after = sealGrant(TOKEN, grantAadOf('7'), ringOf(rotated));

    expect(after.split('.')[1]).toBe('k2');
    expect(api.openGrant(before, api.grantAadOf('7'), apiRingOf(rotated))?.keyId).toBe('k1');
    expect(api.openGrant(after, api.grantAadOf('7'), apiRingOf(rotated))?.keyId).toBe('k2');
    expect(api.openGrant(after, api.grantAadOf('7'), apiRingOf(old))).toBeNull();
  });

  it('reads a ring as the API does: base64 or base64url keys, ids of up to 16 characters, the last one sealing', () => {
    const bytes = Buffer.from(Array.from({ length: 32 }, (_, index) => 250 - index));
    for (const text of [bytes.toString('base64'), bytes.toString('base64url')]) {
      const value = ` A_b-0123456789xy:${text} , k2:${keyText()} `;
      expect(ringOf(value).keys.get('A_b-0123456789xy')).toEqual(bytes);
      expect(ringOf(value).sealingId).toBe(apiRingOf(value).sealingId);
    }
    expect(sealKeyRingOf(undefined)).toBeNull();
    expect(sealKeyRingOf(' , ')).toBeNull();
  });

  it.each([
    ['no key id', `:${keyText()}`],
    ['a key id with a dot', `k.1:${keyText()}`],
    ['a key id of 17 characters', `${'k'.repeat(17)}:${keyText()}`],
    ['a key that is not base64', `k1:${'*'.repeat(44)}`],
    ['a short key', `k1:${randomBytes(16).toString('base64')}`],
    [
      'a key id twice',
      'k1:AQgPFh0kKzI5QEdOVVxjanF4f4aNlJuiqbC3vsXM09o=,k1:AQgPFh0kKzI5QEdOVVxjanF4f4aNlJuiqbC3vsXM09o=',
    ],
  ])('refuses a ring with %s, naming the variable and never the key', (_case, value) => {
    expect(() => sealKeyRingOf(value)).toThrow(new RegExp(`^${SEAL_KEYS_ENV} entry \\d`));
    expect(() => api.sealKeyRingOf(value)).toThrow();
  });

  it('opens nothing changed or foreign', () => {
    const ring = ringOf(`k1:${keyText()}`);
    const sealed = sealGrant(TOKEN, grantAadOf('9'), ring);
    const parts = sealed.split('.');
    const flipped = [...parts];
    flipped[3] = `${parts[3].startsWith('A') ? 'B' : 'A'}${parts[3].slice(1)}`;

    expect(openGrant(flipped.join('.'), grantAadOf('9'), ring)).toBeNull();
    expect(openGrant(['v2', ...parts.slice(1)].join('.'), grantAadOf('9'), ring)).toBeNull();
    expect(openGrant(sealed, grantAadOf('9'), ringOf(`k1:${keyText()}`))).toBeNull();
    expect(openGrant(TOKEN, grantAadOf('9'), ring)).toBeNull();
  });
});
