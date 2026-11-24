import type { LessonStep } from '@/lib/learn/learn.types';

/** A step's anchor on the page. */
export const stepAnchorOf = (step: Pick<LessonStep, 'id'>) => `step-${step.id}`;
