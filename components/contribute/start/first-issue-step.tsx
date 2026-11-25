'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { WhoDoesTheWork } from './who-does-the-work';
import { LanguagesDialog } from '@/components/contribute/languages-dialog';
import { Button } from '@/components/ui/button';
import { FLOW_WAYS_OUT, FlowBookmark, FlowExit } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import {
  languagesLineOf,
  languagesLineText,
  REPICK_GIVE_UP_MS,
  REPICK_POLL_MS,
  repickedOf,
  startingLanguagesOf,
} from '@/lib/contribute/start-flow';
import type { StartWays } from '@/lib/contribute/start-ways';
import { readFeedComputedAt } from '@/lib/workspace/actions';
import type { ContributeLanguage, ContributePreferences } from '@/lib/workspace/contribute.types';
import { markContributeOnboarded } from '@/lib/workspace/onboarding.actions';

/** The one line under the head when the sign could not be set twice in a row. */
export const MARK_FAILED_LINE = 'We could not finish setting up. Try again in a moment.';

/**
 * Where the Contribute sign stands on this page: not needed or set (`done`), being set (`pending`), failed once
 * (`failed`, tried again on the next press), failed again (`error`, the line says so), or refused because nothing is
 * connected (`none`: the first step's case is drawn instead).
 */
export type MarkState = 'done' | 'pending' | 'failed' | 'error' | 'none';

type Outcome = 'done' | 'none' | 'failed';

async function markOnce(): Promise<Outcome> {
  const result = await markContributeOnboarded().catch(() => null);
  if (!result?.ok) return 'failed';
  return result.data ? 'done' : 'none';
}

/** What a part of the list may ask of the page: open the languages dialog ("Add a language"). */
const LanguagesContext = createContext<(() => void) | null>(null);

/** "Add a language" in the list's place when nothing fits: opens the page's languages dialog. */
export function AddLanguageButton() {
  const open = useContext(LanguagesContext);
  return (
    <Button type="button" variant="outline" className="h-9 px-4 max-sm:min-h-11" onClick={() => open?.()}>
      Add a language
    </Button>
  );
}

export type FirstIssueLanguages = {
  /** The saved languages; null when nothing is saved. */
  saved: ContributeLanguage[] | null;
  /** The profile's, read beside the page; none when unread. */
  profile: ContributeLanguage[];
  preferences: ContributePreferences | null;
};

/**
 * The second step of Contribute's flow, "Pick your first issue", around what the server drew of it: the issue the
 * person opened (`opened`), the list or its case (`children`), and the ways out under it (`foot`). It owns three things
 * the browser does:
 * - the Contribute sign: for a person without it (`mark`), it is set from here once the page is drawn, never while the
 *   server renders it and never on a prefetch. Until it answers, every way out (a Start control, anything marked
 *   `data-flow-leave`) waits for it, then goes on. A false answer (nothing connected) draws the first step's case in
 *   place, which never comes back here by itself;
 * - the line of languages with "Change", and the languages dialog;
 * - after a save, the list says it is picking again (`picking`) until the list's time is later than before the save,
 *   then it is read again in place; past two minutes it is read as it stands.
 * While the first picks are made, the list's own "being picked" box reads the page again by itself: no live poll runs
 * on this page.
 */
export function FirstIssueStep({
  mark: needsMark,
  head,
  languages,
  nothingConnected,
  picking,
  opened,
  children,
  foot,
  initialMark,
}: {
  mark: boolean;
  head: { title: string; text: string };
  languages: FirstIssueLanguages;
  /** The first step in its "nothing connected" case, with the way back on its buttons. */
  nothingConnected: StartWays;
  /** The list's "being picked" box. */
  picking: ReactNode;
  /** "The issue you opened", first, when the flow was opened from an issue that still reads. */
  opened?: ReactNode;
  children: ReactNode;
  foot: ReactNode;
  /** Where the sign stands when drawn, for the design catalogue's cases (the page leaves it to the effect). */
  initialMark?: MarkState;
}) {
  const router = useRouter();
  const [mark, setMark] = useState<MarkState>(initialMark ?? (needsMark ? 'pending' : 'done'));
  const markNow = useRef<MarkState>(mark);
  const asking = useRef<Promise<Outcome> | null>(null);

  const settle = useCallback((outcome: Outcome) => {
    const next: MarkState = outcome === 'failed' ? (markNow.current === 'pending' ? 'failed' : 'error') : outcome;
    markNow.current = next;
    setMark(next);
    return next;
  }, []);

  const ask = useCallback(() => {
    asking.current ??= markOnce().finally(() => {
      asking.current = null;
    });
    return asking.current;
  }, []);

  // Once drawn in the browser: a second call changes nothing, so a remount asking again is harmless.
  useEffect(() => {
    if (!needsMark) return;
    let live = true;
    void ask().then((outcome) => {
      if (live) settle(outcome);
    });
    return () => {
      live = false;
    };
  }, [needsMark, ask, settle]);

  const hold = (event: MouseEvent<HTMLDivElement>) => {
    if (markNow.current === 'done' || !(event.target instanceof Element)) return;
    const way = event.target.closest(FLOW_WAYS_OUT);
    if (!way) return;
    event.preventDefault();
    event.stopPropagation();
    if (markNow.current === 'none') return;
    const control = event.target.closest<HTMLElement>('a, button') ?? (way as HTMLElement);
    void ask().then((outcome) => {
      if (settle(outcome) === 'done') control.click();
    });
  };

  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<ContributeLanguage[] | null>(languages.saved);
  const [repicking, setRepicking] = useState(false);
  const before = useRef<string | null>(null);
  const [, startRefresh] = useTransition();

  // After a save: ask the list's time until it is later than the one read before the save, or two minutes pass.
  useEffect(() => {
    if (!repicking) return;
    let stopped = false;
    const started = Date.now();
    const finish = () => {
      stopped = true;
      clearInterval(timer);
      startRefresh(() => {
        router.refresh();
        setRepicking(false);
      });
    };
    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started >= REPICK_GIVE_UP_MS) return finish();
      if (document.visibilityState !== 'visible') return;
      const result = await readFeedComputedAt().catch(() => null);
      if (!stopped && result?.ok && repickedOf(before.current, result.data)) finish();
    };
    const timer = setInterval(tick, REPICK_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [repicking, router]);

  if (mark === 'none') {
    return (
      <FlowFrame side="contribute" step={1}>
        <WhoDoesTheWork ways={nothingConnected} />
        <FlowBookmark side="contribute" />
      </FlowFrame>
    );
  }

  const line = languagesLineOf(saved, languages.profile);
  return (
    <FlowFrame side="contribute" step={2}>
      <FlowHead title={head.title} text={head.text}>
        {mark === 'error' ? (
          <p role="alert" className="m-0 text-sm text-destructive" data-mark-failed="">
            {MARK_FAILED_LINE}
          </p>
        ) : null}
      </FlowHead>
      <LanguagesContext.Provider value={() => setOpen(true)}>
        <div className="contents" data-mark={mark} onClickCapture={hold}>
          <div className="flex flex-col gap-4">
            <p className="m-0 text-sm text-muted-foreground" data-languages-line="">
              {line.names ? (
                <>
                  Picked for <span className="font-medium text-foreground">{line.names}</span>
                  {line.fromProfile ? ', from your GitHub profile.' : '.'}
                </>
              ) : (
                languagesLineText(line)
              )}{' '}
              <LanguagesDialog
                open={open}
                onOpenChange={setOpen}
                start={startingLanguagesOf(saved, languages.profile)}
                preferences={languages.preferences}
                trigger={
                  <button type="button" className="text-sm font-semibold text-link hover:underline">
                    Change
                  </button>
                }
                beforeSave={async () => {
                  const result = await readFeedComputedAt().catch(() => null);
                  before.current = result?.ok ? result.data : null;
                }}
                onSaved={(draft) => {
                  setSaved(draft.languages);
                  setRepicking(true);
                }}
              />
            </p>
            <FlowExit side="contribute">
              {opened}
              {repicking ? picking : children}
              {foot}
            </FlowExit>
          </div>
        </div>
      </LanguagesContext.Provider>
      <FlowBookmark side="contribute" />
    </FlowFrame>
  );
}
