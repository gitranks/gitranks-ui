import { SessionProvider } from 'next-auth/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { StarsReview } from '../utils/stars-review';
import { StarsReviewNote } from './stars-review-note';
import { StarsReviewStatus } from '@/types/generated/graphql';

// The cached page renders without a session, so the button renders as it does while the session loads.
const render = (starsReview: StarsReview | null) =>
  renderToStaticMarkup(
    <SessionProvider>
      <StarsReviewNote login="octocat" starsReview={starsReview} />
    </SessionProvider>,
  ).replaceAll('&#x27;', "'");

describe('StarsReviewNote', () => {
  it('renders nothing when no stars are held', () => {
    expect(render(null)).toBe('');
  });

  it('says the stars do not count while the review runs', () => {
    const html = render({ status: StarsReviewStatus.Reviewing, stars: 1234, repositories: 801, reportable: true });

    expect(html).toContain(
      "We're reviewing an unusual starring pattern. Until we're done, 1,234 stars on 801 repositories don't count toward this ranking.",
    );
    expect(html).toContain('This is a mistake');
  });

  it('says why the stars do not count once they are not counted', () => {
    const html = render({ status: StarsReviewStatus.NotCounted, stars: 1234, repositories: 801, reportable: true });

    expect(html).toContain(
      "1,234 stars on 801 repositories don't count toward this ranking: they don't look like organic interest in the projects.",
    );
  });

  it('keeps the note but drops the button when the review is not reportable', () => {
    const html = render({ status: StarsReviewStatus.NotCounted, stars: 1234, repositories: 801, reportable: false });

    expect(html).toContain("don't count toward this ranking");
    expect(html).not.toContain('This is a mistake');
  });
});
