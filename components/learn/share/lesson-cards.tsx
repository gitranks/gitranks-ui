import type { ReactElement } from 'react';

import type { LearnLesson } from '@/lib/learn/lesson-page';
import {
  factCardTextOf,
  lessonCardAddressOf,
  lessonCardAddressSize,
  lessonCardFixesOf,
  lessonCardTitleSize,
} from '@/lib/learn/lesson-share-card';
import { CARD_COLORS, Figure, Frame } from '@/lib/social-card/card-parts';

/*
 * The two pictures a posted link to a lesson shows, as page 21 draws them: the lesson's own, and its fun fact's (the
 * lesson's address with `?fact`). Plain elements in the card's inline styles: the server draws them as PNGs, and the
 * design catalogue draws the same elements. Light colours only, no avatar, no zero.
 */

/** The lesson's address in its corner, in the card's mono type. */
function Address({ slug }: Readonly<{ slug: string }>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: 'JetBrains Mono',
        fontWeight: 700,
        fontSize: lessonCardAddressSize(slug),
        color: CARD_COLORS.muted,
      }}
    >
      {lessonCardAddressOf(slug)}
    </div>
  );
}

/**
 * A lesson's picture: its title, then its course and group, the merged fixes that used it (from 3; below, the place
 * stays empty), and its address.
 */
export function LessonCard({
  lesson,
}: Readonly<{ lesson: Pick<LearnLesson, 'slug' | 'title' | 'course' | 'group' | 'fixesMerged'> }>): ReactElement {
  const fixes = lessonCardFixesOf(lesson);
  return (
    <Frame eyebrow="Lesson" brand="start">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            fontSize: lessonCardTitleSize(lesson.title),
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: -0.5,
          }}
        >
          {lesson.title}
        </div>
        <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.35, color: CARD_COLORS.muted }}>
          {`${lesson.course.title} · ${lesson.group.title}`}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {fixes ? <Figure value={fixes.value} label={fixes.label} /> : null}
        <Address slug={lesson.slug} />
      </div>
    </Frame>
  );
}

/** A fun fact's picture: the fact's own short title, its first sentences, the lesson it comes from, the address. */
export function FactCard({
  lesson,
  fact,
}: Readonly<{ lesson: Pick<LearnLesson, 'slug' | 'title'>; fact: { title: string; text: string } }>): ReactElement {
  const from = lesson.title.split(/\s+/);
  return (
    <Frame eyebrow="Did you know?" brand="start" eyebrowColor={CARD_COLORS.violet}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, lineHeight: 1.18, letterSpacing: -0.5 }}>
          {fact.title}
        </div>
        <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.4 }}>{factCardTextOf(fact.text)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Each word its own item, so the line wraps between words as text would, the lesson's title in bold. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 26, color: CARD_COLORS.muted }}>
          <span style={{ marginRight: 8 }}>From the lesson</span>
          {from.map((word, at) => (
            <span key={`${word}-${at}`} style={{ marginRight: 8, fontWeight: 600, color: CARD_COLORS.ink }}>
              {word}
            </span>
          ))}
        </div>
        <Address slug={lesson.slug} />
      </div>
    </Frame>
  );
}
