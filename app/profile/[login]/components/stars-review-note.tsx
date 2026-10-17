import { Info } from 'lucide-react';
import type { FC } from 'react';

import { type StarsReview, starsReviewNote } from '../utils/stars-review';
import { StarsReviewReport } from './stars-review-report';

type StarsReviewNoteProps = {
  login: string;
  starsReview?: StarsReview | null;
};

/** Says which stars do not count toward the ranking. Rendered in the cached page, so it never reads the session. */
export const StarsReviewNote: FC<StarsReviewNoteProps> = ({ login, starsReview }) => {
  if (!starsReview) {
    return null;
  }

  return (
    <div className="flex gap-2 rounded-md bg-muted p-2 text-sm text-muted-foreground">
      <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
      <div className="flex flex-col items-start gap-2">
        <p>{starsReviewNote(starsReview)}</p>
        <StarsReviewReport login={login} reportable={starsReview.reportable} />
      </div>
    </div>
  );
};
