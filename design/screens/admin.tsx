import type { Screen, ScreenState } from '../registry';
import { boardOf } from '@/app/admin/unsung-hero/__fixtures__/board';
import type { HeroBoard } from '@/app/admin/unsung-hero/admin.types';
import { AdminBoard } from '@/app/admin/unsung-hero/components/admin-board';
import { Header } from '@/components/header/header';

const PATH = '/admin/unsung-hero';

/** Before launch every slot is a preview: Cancel applies to each, and none holds a real week. */
const previewBoard = (): HeroBoard => {
  const board = boardOf({ preview: true });
  const asPreview = (slots: HeroBoard['live']) => slots.map((slot) => ({ ...slot, preview: true }));
  return { ...board, live: asPreview(board.live), upcoming: asPreview(board.upcoming) };
};

/** The page as `page.tsx` draws it for the admin: the header, then the board as the API answered it. */
const page = (board: HeroBoard) => (
  <>
    <Header />
    <AdminBoard state={{ board, notice: null, check: null }} />
  </>
);

/** One state on desktop. */
const one = (id: string, title: string, board: HeroBoard, height: number): ScreenState => ({
  id,
  title,
  path: PATH,
  height,
  render: () => page(board),
});

/** One state on desktop and on a phone. */
const both = (id: string, title: string, board: HeroBoard, height: number, phoneHeight: number): ScreenState[] => [
  one(id, title, board, height),
  {
    id: `${id}-phone`,
    title: `${title}, phone`,
    path: PATH,
    width: 390,
    height: phoneHeight,
    render: () => page(board),
  },
];

export const ADMIN_SCREENS: Screen[] = [
  {
    id: 'admin-unsung-hero',
    title: 'Unsung hero admin',
    area: 'admin',
    route: PATH,
    sources: [
      'app/admin/unsung-hero/page.tsx',
      'app/admin/unsung-hero/components/admin-board.tsx',
      'app/admin/unsung-hero/components/weeks.tsx',
      'app/admin/unsung-hero/components/shortlist.tsx',
      'app/admin/unsung-hero/components/past.tsx',
      'app/admin/unsung-hero/components/slot-parts.tsx',
      'app/admin/unsung-hero/components/confirm-press.tsx',
      'app/admin/unsung-hero/components/schedule-dialog.tsx',
      'app/admin/unsung-hero/admin-copy.ts',
      'app/admin/unsung-hero/__fixtures__/board.ts',
    ],
    states: [
      ...both('board', 'Live, next and coming weeks', boardOf(), 1290, 2110),
      one('preview', 'Before launch', previewBoard(), 1270),
      one('empty-week', 'Nobody this week or next', boardOf({ live: [], upcoming: [] }), 850),
    ],
  },
];
