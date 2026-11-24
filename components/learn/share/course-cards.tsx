import type { ReactElement } from 'react';

import type { LearnCourse } from '@/lib/learn/course';
import {
  type CardFigure,
  COURSES_CARD_ADDRESS,
  courseCardAddressOf,
  courseCardFiguresOf,
  courseCardSubOf,
  courseCardTitleSize,
  LEARN_CARD_HEADLINE,
} from '@/lib/learn/course-share-card';
import { CARD_COLORS, Figure, Frame } from '@/lib/social-card/card-parts';

/*
 * The pictures a posted link to a course, and to all courses, shows, as page 21 draws them. Plain elements in the
 * card's inline styles: the server draws them as PNGs, and the design catalogue draws the same elements. Light
 * colours only, no avatar, no zero: a figure not worth showing leaves its place empty.
 */

/** The figures in a row, and the page's address under them in the corner, so three figures keep their room. */
function Foot({ figures, address }: Readonly<{ figures: readonly CardFigure[]; address: string }>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 56 }}>
        {figures.map((figure) => (
          <Figure key={figure.label} value={figure.value} label={figure.label} />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontFamily: 'JetBrains Mono',
          fontWeight: 700,
          fontSize: address.length > 44 ? 20 : 24,
          color: CARD_COLORS.muted,
        }}
      >
        {address}
      </div>
    </div>
  );
}

/**
 * A course's picture: its name, its kind and languages, its lessons, its learners from 10, the real issues fixed with
 * it from 5, and its address.
 */
export function CourseShareCard({
  course,
}: Readonly<{
  course: Pick<LearnCourse, 'slug' | 'name' | 'kind' | 'languages' | 'lessons' | 'numbers'>;
}>): ReactElement {
  return (
    <Frame eyebrow="Course" brand="start">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            fontSize: courseCardTitleSize(course.name),
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: -0.5,
          }}
        >
          {course.name}
        </div>
        <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.35, color: CARD_COLORS.muted }}>
          {courseCardSubOf(course)}
        </div>
      </div>
      <Foot figures={courseCardFiguresOf(course)} address={courseCardAddressOf(course.slug)} />
    </Frame>
  );
}

/** The picture of every other Learn page, all courses among them: the headline, and the courses and their lessons. */
export function LearnShareCard({ figures }: Readonly<{ figures: readonly CardFigure[] }>): ReactElement {
  return (
    <Frame eyebrow="Learn" brand="start">
      <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, lineHeight: 1.18, letterSpacing: -0.5 }}>
        {LEARN_CARD_HEADLINE}
      </div>
      <Foot figures={figures} address={COURSES_CARD_ADDRESS} />
    </Frame>
  );
}
