import { Pill } from '@/components/pill/pill';
import { LEARN_PR_LABELS } from '@/lib/learn/progress/progress';
import type { LearnPrLabel } from '@/lib/learn/progress/progress.types';

/**
 * An own lesson's pull request on Your progress, as one pill: Merged, Closed, Open, Opening, Ready to submit, Being
 * rewritten or Ended. Its words are where the lesson's pull request is, not a pull request's states alone.
 */
export function LearnLessonStatePill({ label }: { label: LearnPrLabel }) {
  const { label: text, tone } = LEARN_PR_LABELS[label] ?? LEARN_PR_LABELS.ENDED;
  return (
    <span data-pr-label={label} className="contents">
      <Pill tone={tone}>{text}</Pill>
    </span>
  );
}
