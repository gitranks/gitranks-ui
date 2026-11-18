import { describe, expect, it } from 'vitest';

import { drawImages, imagePathOf, withBadgeFacts } from './images';
import { userBig } from '@/badge/v3/fixtures';

withBadgeFacts(userBig);

const badge = `<img src="/badge/user/${userBig.login}/profile-card.svg" alt="">`;

describe('the boards images', () => {
  it('names an image by its content', () => {
    expect(imagePathOf('<svg/>', 'svg')).toMatch(/^current\/img\/[0-9a-f]{12}\.svg$/);
    expect(imagePathOf('<svg/>', 'svg')).toBe(imagePathOf('<svg/>', 'svg'));
    expect(imagePathOf('<svg/>', 'svg')).not.toBe(imagePathOf('<svg></svg>', 'svg'));
  });

  it('points boards that show the same badge at one file', async () => {
    const first = await drawImages(badge, 'current/profile/profile--a.dc.html');
    const second = await drawImages(`<p>${badge}</p>`, 'current/landing/landing--b.dc.html');
    expect([...first.images.keys()]).toEqual([...second.images.keys()]);
    const [path] = [...first.images.keys()];
    expect(path).toBe(imagePathOf(first.images.get(path) ?? '', 'svg'));
    expect(first.markup).toBe(`<img src="../../${path}" alt="">`);
    expect(second.markup).toBe(`<p><img src="../../${path}" alt=""></p>`);
    // Drawing a badge loads its fonts first: past vitest's 5 seconds on a busy machine.
  }, 60_000);
});
