import { LessonBlock } from './lesson-block';
import { blockOfVisual } from '@/lib/workspace/blocks/learn-visual';

/**
 * A course's visual (a table, a diagram, a before-and-after of two diagrams), drawn by today's views. One of an unknown
 * kind or shape draws nothing.
 */
export function VisualBlock({ visual, id }: { visual: unknown; id: string }) {
  const block = blockOfVisual(visual);
  return block ? <LessonBlock block={block} id={id} /> : null;
}
