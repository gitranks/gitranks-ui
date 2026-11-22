import type { Screen, ScreenState } from '../registry';
import { boardOf, boardWithApplications, SHORTLIST_WITH_SLOTS } from '@/app/admin/unsung-hero/__fixtures__/board';
import type { HeroBoard } from '@/app/admin/unsung-hero/admin.types';
import { AdminBoard, type AdminTab } from '@/app/admin/unsung-hero/components/admin-board';
import { Header } from '@/components/header/header';

const PATH = '/admin/unsung-hero';

/** The page as `page.tsx` draws it for the admin: the header, then the board as the API answered it. */
const page = (board: HeroBoard, tab?: AdminTab) => (
  <>
    <Header />
    <AdminBoard state={{ board, notice: null, check: null }} tab={tab} />
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
      'app/admin/unsung-hero/components/applications.tsx',
      'app/admin/unsung-hero/components/past.tsx',
      'app/admin/unsung-hero/components/slot-parts.tsx',
      'app/admin/unsung-hero/components/confirm-press.tsx',
      'app/admin/unsung-hero/components/schedule-dialog.tsx',
      'app/admin/unsung-hero/admin-copy.ts',
      'app/admin/unsung-hero/__fixtures__/board.ts',
    ],
    states: [
      ...both('board', 'Live, next and coming weeks', boardOf(), 1290, 2110),
      one('shortlist-slots', 'Shortlist rows that have a slot', boardOf({ shortlist: SHORTLIST_WITH_SLOTS }), 1580),
      one('empty-week', 'Nobody this week or next', boardOf({ live: [], upcoming: [] }), 850),
      {
        id: 'applications',
        title: 'Applications in review: an owner’s, a nomination, misses, not found',
        path: PATH,
        height: 1590,
        render: () => page(boardWithApplications(), 'applications'),
      },
    ],
  },
];
