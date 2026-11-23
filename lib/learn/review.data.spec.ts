import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, highlightCodes } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  highlightCodes: vi.fn(async (codes: readonly { language: string; code: string }[]) =>
    codes.map((code) => ({ language: code.language, lines: [[{ text: 'lit' }]] })),
  ),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./highlight', () => ({ highlightCodes }));

const { loadLearnReviewSide } = await import('./review.data');
const { LearnCourseNextDocument, LearnHomeNextDocument, LearnReviewDocument } = await import('./review.documents');
const { reviewItem } = await import('./__fixtures__/review');

const { highlighted: _, ...item } = reviewItem('r1');
const review = { items: [item], more: 3, nextReviewAt: null, nextReviewLessons: 0 };
const next = { slug: 'sliding-window', title: 'Sliding window' };
const sql = { slug: 'sql', title: 'SQL' };

/** Answers each read by its document. */
function answer({
  learnReview = review as unknown,
  learnHome = { next, nextCourse: null } as unknown,
  learnCourseMine = { slug: 'algorithms', next } as unknown,
} = {}) {
  graphqlDirect.mockImplementation(async (document: unknown) => {
    if (document === LearnReviewDocument) {
      if (learnReview instanceof Error) throw learnReview;
      return { learnReview };
    }
    if (document === LearnHomeNextDocument) {
      if (learnHome instanceof Error) throw learnHome;
      return { learnHome };
    }
    if (document === LearnCourseNextDocument) return { learnCourseMine };
    throw new Error('unexpected read');
  });
}

beforeEach(() => {
  graphqlDirect.mockReset();
  highlightCodes.mockClear();
});

describe("the person's review", () => {
  it('reads every course’s set as the person, highlights its code, and names the next lesson', async () => {
    answer();
    const side = await loadLearnReviewSide('octocat', null);
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnReviewDocument,
      { course: null },
      { source: 'ssr', githubLogin: 'octocat' },
    );
    expect(side).toEqual({
      items: [
        {
          ...item,
          highlighted: item.question.codes.map((code) => ({ language: code.language, lines: [[{ text: 'lit' }]] })),
        },
      ],
      more: 3,
      nextReviewAt: null,
      nextReviewLessons: 0,
      next: { kind: 'lesson', link: next },
    });
  });

  it('names the next course when no lesson is next, and nothing when there is neither', async () => {
    answer({ learnHome: { next: null, nextCourse: sql } });
    expect((await loadLearnReviewSide('octocat', null))!.next).toEqual({ kind: 'course', link: sql });
    answer({ learnHome: { next: null, nextCourse: null } });
    expect((await loadLearnReviewSide('octocat', null))!.next).toBeNull();
  });

  it('reads one course’s set and its next lesson; a course of another shape is every course', async () => {
    answer();
    expect((await loadLearnReviewSide('octocat', 'algorithms'))!.next).toEqual({ kind: 'lesson', link: next });
    expect(graphqlDirect).toHaveBeenCalledWith(LearnReviewDocument, { course: 'algorithms' }, expect.anything());
    expect(graphqlDirect).toHaveBeenCalledWith(LearnCourseNextDocument, { slug: 'algorithms' }, expect.anything());
    graphqlDirect.mockClear();
    await loadLearnReviewSide('octocat', '../admin');
    expect(graphqlDirect).toHaveBeenCalledWith(LearnReviewDocument, { course: null }, expect.anything());
  });

  it('draws plain code when highlighting fails', async () => {
    answer();
    highlightCodes.mockRejectedValueOnce(new Error('no grammar'));
    const side = await loadLearnReviewSide('octocat', null);
    expect(side!.items[0].highlighted[0].language).toBe(item.question.codes[0].language);
    expect(side!.items[0].highlighted[0].lines.length).toBeGreaterThan(1);
  });

  it('is none when Learn is not open or the set cannot be read; a failed next only drops the next step', async () => {
    answer({ learnReview: null });
    expect(await loadLearnReviewSide('octocat', null)).toBeNull();
    answer({ learnReview: new Error('down') });
    expect(await loadLearnReviewSide('octocat', null)).toBeNull();
    answer({ learnHome: new Error('down') });
    expect((await loadLearnReviewSide('octocat', null))!.next).toBeNull();
  });
});
