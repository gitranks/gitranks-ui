import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prCard } from '@/lib/contribute/__fixtures__/maintainers';
import { result } from '@/lib/learn/__fixtures__/shared';

const { loadPrStrip, loadLessonResult, loadMyResultReaction, hasReactionMark, viewerLogin } = vi.hoisted(() => ({
  loadPrStrip: vi.fn(),
  loadLessonResult: vi.fn(),
  loadMyResultReaction: vi.fn(),
  hasReactionMark: vi.fn(),
  viewerLogin: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/pr-card.data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/workspace/pr-card.data')>()),
  loadPrStrip,
}));
vi.mock('./lesson-public.data', () => ({ loadLessonResult, loadMyResultReaction }));
vi.mock('./react-mark', () => ({ hasReactionMark }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { loadLearnPrCard, loadPrLesson } = await import('./pr-lesson.data');
const { prLessonTargetOf } = await import('./pr-lesson');

const ID = '6650a1b2c3d4e5f6a7b8c9d0';
const SLUG = 'route-cache-miss-8f3k';
const LEARN = prCard({ contributorLogin: 'octocat', learn: { slug: SLUG } });

describe('the Learn maintainers page’s footer link (Learn spec §9.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewerLogin.mockResolvedValue(null);
    hasReactionMark.mockResolvedValue(false);
    loadMyResultReaction.mockResolvedValue({ canReact: false, reaction: null });
  });

  it('shows on top only a Learn pull request’s card: none for an unknown id or a Contribute pull request', async () => {
    loadPrStrip.mockResolvedValueOnce(null).mockResolvedValueOnce(prCard()).mockResolvedValueOnce(LEARN);
    expect(await loadLearnPrCard(ID)).toBeNull();
    expect(await loadLearnPrCard(ID)).toBeNull();
    expect(await loadLearnPrCard(ID)).toBe(LEARN);
    expect(await loadPrLesson(null, undefined)).toBeNull();
    expect(await loadPrLesson(prCard(), undefined)).toBeNull();
    expect(loadLessonResult).not.toHaveBeenCalled();
  });

  it('a lesson not public now is the neutral line, read from the card alone', async () => {
    const card = { ...LEARN, learn: { slug: null } };
    expect(await loadPrLesson(card, undefined)).toEqual({ kind: 'closed', card });
    expect(loadLessonResult).not.toHaveBeenCalled();
  });

  it('reads the author’s public result, the same for everyone, and the visitor’s reaction', async () => {
    loadLessonResult.mockResolvedValue({ kind: 'found', value: result() });
    loadMyResultReaction.mockResolvedValue({ canReact: true, reaction: 'YES' });

    const read = await loadPrLesson(LEARN, undefined);
    expect(loadLessonResult).toHaveBeenCalledWith(SLUG, 'octocat');
    expect(read).toMatchObject({
      kind: 'lesson',
      card: LEARN,
      viewer: { canReact: true, mine: 'YES', returned: null, own: false },
    });
  });

  it('takes a pick back from the sign-in only with the mark this browser left, and none for the author', async () => {
    loadLessonResult.mockResolvedValue({ kind: 'found', value: result() });
    hasReactionMark.mockResolvedValueOnce(true);
    expect(await loadPrLesson(LEARN, 'no')).toMatchObject({ viewer: { returned: 'NO' } });
    expect(hasReactionMark).toHaveBeenCalledWith(SLUG, 'octocat', 'NO');

    viewerLogin.mockResolvedValue('OctoCat');
    loadMyResultReaction.mockClear();
    expect(await loadPrLesson(LEARN, undefined)).toMatchObject({ viewer: { own: true, canReact: false, mine: null } });
    expect(loadMyResultReaction).not.toHaveBeenCalled();
  });

  it('a stub or no public result is the neutral line; a failed read or a result not the author’s adds nothing', async () => {
    loadLessonResult.mockResolvedValueOnce({ kind: 'stub', visibility: 'REMOVED' });
    expect(await loadPrLesson(LEARN, undefined)).toEqual({ kind: 'closed', card: LEARN });

    loadLessonResult.mockResolvedValueOnce(null);
    expect(await loadPrLesson(LEARN, undefined)).toEqual({ kind: 'closed', card: LEARN });

    loadLessonResult.mockRejectedValueOnce(new Error('down'));
    expect(await loadPrLesson(LEARN, undefined)).toBeNull();

    const other = result({ login: 'mona', loginAtPass: 'mona' });
    loadLessonResult.mockResolvedValueOnce({ kind: 'found', value: other });
    expect(await loadPrLesson(LEARN, undefined)).toBeNull();
  });

  it('names the read a card leads to', () => {
    expect(prLessonTargetOf(null)).toBeNull();
    expect(prLessonTargetOf(prCard())).toBeNull();
    expect(prLessonTargetOf({ ...LEARN, contributorLogin: null })).toBeNull();
    expect(prLessonTargetOf({ ...LEARN, learn: { slug: null } })).toEqual({ kind: 'closed' });
    expect(prLessonTargetOf(LEARN)).toEqual({ kind: 'result', slug: SLUG, login: 'octocat' });
  });
});
