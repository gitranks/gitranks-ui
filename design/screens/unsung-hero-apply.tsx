import type { Screen, ScreenState } from '../registry';
import {
  applicationOf,
  FOUND,
  MY_PACKAGES,
  VISITOR_VIEW,
  viewOf,
  WEEK_46,
} from '@/app/unsung-heroes/apply/__fixtures__/apply';
import type { ApplyFormStart } from '@/app/unsung-heroes/apply/components/apply-form';
import { HeroApplyScreen } from '@/app/unsung-heroes/apply/components/hero-apply-screen';
import { Button } from '@/components/ui/button';
import type { HeroApplyView } from '@/lib/unsung-hero/apply.types';
import { cancelCopyOf, packageKey } from '@/lib/unsung-hero/apply-copy';
import { UNSUNG_HERO_APPLY_PATH } from '@/lib/unsung-hero/unsung-hero';

const NOTE = 'Most date pickers use it for clamping. I have maintained it alone since 2017.';

type Drawn = { view: HeroApplyView | null; signedIn?: boolean; start?: ApplyFormStart; cancel?: boolean };

/** The cancel confirm drawn open over its page: a portal renders nothing on the server, so the board draws its box. */
function OpenCancelDialog({ name }: Readonly<{ name: string }>) {
  const copy = cancelCopyOf(name);
  return (
    <div className="absolute inset-0 flex items-start justify-center bg-black/50 px-4 pt-40">
      <div
        role="alertdialog"
        aria-label={copy.title}
        className="grid w-full max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg"
      >
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h2 className="text-lg font-semibold">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline">{copy.keep}</Button>
          <Button>{copy.confirm}</Button>
        </div>
      </div>
    </div>
  );
}

const page = ({ view, signedIn = true, start, cancel }: Drawn) => (
  <div className="relative">
    <HeroApplyScreen view={view} signedIn={signedIn} start={start} />
    {cancel && <OpenCancelDialog name="tiny-clamp" />}
  </div>
);

/** One state on desktop, and on a phone when `phoneHeight` is given. */
const state = (id: string, title: string, drawn: Drawn, height: number, phoneHeight?: number): ScreenState[] => {
  const one = { path: UNSUNG_HERO_APPLY_PATH, signedOut: drawn.signedIn === false, render: () => page(drawn) };
  return [
    { id, title, height, ...one },
    ...(phoneHeight ? [{ id: `${id}-phone`, title: `${title}, phone`, width: 390, height: phoneHeight, ...one }] : []),
  ];
};

const CHOSEN: ApplyFormStart = { chosen: packageKey(MY_PACKAGES[0]), note: NOTE };

export const UNSUNG_HERO_APPLY_SCREENS: Screen[] = [
  {
    id: 'unsung-hero-apply',
    title: 'Apply for Unsung hero',
    area: 'landing',
    route: UNSUNG_HERO_APPLY_PATH,
    sources: [
      'app/unsung-heroes/apply/page.tsx',
      'app/unsung-heroes/apply/components/hero-apply-screen.tsx',
      'app/unsung-heroes/apply/components/apply-panel.tsx',
      'app/unsung-heroes/apply/components/apply-form.tsx',
      'app/unsung-heroes/apply/components/application-card.tsx',
      'app/unsung-heroes/apply/components/apply-sign-in.tsx',
      'app/unsung-heroes/apply/components/apply-parts.tsx',
      'lib/unsung-hero/apply-prompt.ts',
      'lib/unsung-hero/apply-copy.ts',
      'app/unsung-heroes/apply/__fixtures__/apply.ts',
    ],
    states: [
      ...state('signed-out', 'Signed out: the rules and the sign-in', { view: VISITOR_VIEW, signedIn: false }, 1230),
      ...state('choose', 'Choose a package', { view: viewOf() }, 1230),
      ...state('chosen', 'A package chosen: the prompt and the note', { view: viewOf(), start: CHOSEN }, 1380, 2440),
      ...state(
        'nominate',
        'Nominate another package, found by its link, the prompt open',
        {
          view: viewOf(),
          start: {
            nominate: { typed: 'https://www.npmjs.com/package/fast-diff', resolved: FOUND },
            note: 'Every diff viewer I know ships it, and one person maintains it for our org.',
            promptOpen: true,
          },
        },
        2160,
      ),
      ...state('in-review', 'In review', { view: viewOf({ application: applicationOf() }) }, 1230, 1920),
      ...state('cancel', 'Cancel, its confirm', { view: viewOf({ application: applicationOf() }), cancel: true }, 1230),
      ...state(
        'scheduled',
        'Scheduled',
        { view: viewOf({ application: applicationOf({ status: 'SCHEDULED', week: WEEK_46 }) }) },
        1230,
      ),
      ...state(
        'not-picked',
        'Not picked',
        { view: viewOf({ application: applicationOf({ status: 'NOT_PICKED' }) }) },
        1230,
      ),
    ],
  },
];
