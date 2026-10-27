import { afterEach, describe, expect, it, vi } from 'vitest';

import { AVATAR_MAX_BYTES, fetchAvatar, sizedAvatarUrl } from './avatars';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const respond = (body: Uint8Array<ArrayBuffer>, headers: Record<string, string> = { 'content-type': 'image/png' }) =>
  fetchMock.mockResolvedValue(new Response(body, { headers }));

describe('fetchAvatar', () => {
  afterEach(() => fetchMock.mockReset());

  it('asks for 64px from the avatar host, without following redirects', async () => {
    respond(new Uint8Array([1, 2, 3]));
    expect(await fetchAvatar('https://avatars.githubusercontent.com/u/1?v=4')).toBe('data:image/png;base64,AQID');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://avatars.githubusercontent.com/u/1?v=4&s=64',
      expect.objectContaining({ redirect: 'error' }),
    );
  });

  it('fetches nothing from another host', async () => {
    expect(await fetchAvatar('https://example.com/a.png')).toBeNull();
    expect(await fetchAvatar(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a body or a declared length over the cap', async () => {
    respond(new Uint8Array(AVATAR_MAX_BYTES + 1));
    expect(await fetchAvatar('https://avatars.githubusercontent.com/u/1')).toBeNull();
    respond(new Uint8Array(3), { 'content-type': 'image/png', 'content-length': String(AVATAR_MAX_BYTES + 1) });
    expect(await fetchAvatar('https://avatars.githubusercontent.com/u/1')).toBeNull();
  });

  it('refuses what is not an image satori can draw, and any failure', async () => {
    respond(new Uint8Array(3), { 'content-type': 'image/webp' });
    expect(await fetchAvatar('https://avatars.githubusercontent.com/u/1')).toBeNull();
    fetchMock.mockRejectedValue(new TypeError('redirect'));
    expect(await fetchAvatar('https://avatars.githubusercontent.com/u/1')).toBeNull();
  });

  it('keeps an unparsable URL as it is', () => {
    expect(sizedAvatarUrl('not a url')).toBe('not a url');
  });
});
