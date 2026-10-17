import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProfileBadgesSection } from './profile-badges-section';
import type { RankingRanks, RankingScores } from '@/badge/utils/is-ranked-in';

const render = (scores: RankingScores, ranks: RankingRanks) =>
  renderToStaticMarkup(<ProfileBadgesSection login="newcomer" scores={scores} ranks={ranks} />);

describe('ProfileBadgesSection', () => {
  it('shows only the badges of the rankings the profile is in', () => {
    const html = render({ s: 12, c: 7, f: 4 }, { s: 900, c: 1200 });

    expect(html).toContain('/badges/newcomer/stars-rank.svg');
    expect(html).toContain('/badges/newcomer/stars-score.svg');
    expect(html).toContain('/badges/newcomer/contributions-rank.svg');
    expect(html).toContain('/badges/newcomer/contributions-score.svg');
    expect(html).not.toContain('followers-');
  });

  it('hides a ranking the profile has no rank in yet, whatever its score', () => {
    const html = render({ s: 12, c: 7 }, { s: 900, cProvisional: 1300 });

    expect(html).toContain('/badges/newcomer/contributions-rank.svg');
    expect(render({ s: 12, c: 7 }, { s: 900 })).not.toContain('contributions-');
  });

  it('renders nothing for a profile that is in no ranking', () => {
    expect(render({ s: 0, c: null, f: 4 }, null)).toBe('');
  });
});
