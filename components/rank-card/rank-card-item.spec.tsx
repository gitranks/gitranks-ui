import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RankCardTotalValue } from './rank-card-item';
import { UserRankProp } from '@/types/ranking.types';

const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('RankCardTotalValue', () => {
  it('shows the honest total while every star counts', () => {
    const html = renderToStaticMarkup(
      <RankCardTotalValue score={312_000} login="nebula" rankType={UserRankProp.s} showLink={false} />,
    );

    expect(text(html)).toContain('Total stars: 312,000');
    expect(html).not.toContain('<s ');
  });

  it('strikes the total with the stars not counted through before the honest one', () => {
    const html = renderToStaticMarkup(
      <RankCardTotalValue
        score={312_000}
        starsNotCounted={{ stars: 9_400, repositories: 1 }}
        login="nebula"
        rankType={UserRankProp.s}
        showLink={false}
      />,
    );

    expect(html).toMatch(/<s [^>]*>.*321,400.*<\/s><span>312,000<\/span>/);
  });

  it('strikes nothing on the other rankings', () => {
    const html = renderToStaticMarkup(
      <RankCardTotalValue
        score={900}
        starsNotCounted={{ stars: 9_400, repositories: 1 }}
        login="octo-dev"
        rankType={UserRankProp.f}
      />,
    );

    expect(html).not.toContain('<s ');
  });
});
