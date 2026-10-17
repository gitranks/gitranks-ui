import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProfileBadgesSection } from './profile-badges-section';
import type { RankingScores } from '@/badge/utils/is-ranked-in';

const render = (scores: RankingScores) =>
  renderToStaticMarkup(<ProfileBadgesSection login="Dippp10-ally" scores={scores} />);

describe('ProfileBadgesSection', () => {
  it('shows only the badges of the rankings the profile is in', () => {
    const html = render({ s: 12, c: 7, f: 4 });

    expect(html).toContain('/badges/Dippp10-ally/stars-rank.svg');
    expect(html).toContain('/badges/Dippp10-ally/stars-score.svg');
    expect(html).toContain('/badges/Dippp10-ally/contributions-rank.svg');
    expect(html).toContain('/badges/Dippp10-ally/contributions-score.svg');
    expect(html).not.toContain('followers-');
  });

  it('renders nothing for a profile that is in no ranking', () => {
    expect(render({ s: 0, c: null, f: 4 })).toBe('');
  });
});
