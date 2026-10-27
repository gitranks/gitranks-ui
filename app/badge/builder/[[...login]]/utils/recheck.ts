import type { EntityFacts } from '@/badge/v3/facts';

/** What a check found: the entity's facts, or nothing new to show (a miss or a failure keeps the facts shown). */
export type RecheckResult = { status: 'found'; facts: EntityFacts } | { status: 'missing' } | { status: 'error' };

export type Rechecker = {
  /** Starts a check, unless one is under way; `manual` when the visitor asked for it. */
  run: (manual: boolean) => void;
  /** The visitor came back to the page: a check, unless the page is hidden or one started within `every`. */
  onReturn: () => void;
  /** Counts `every` from now, as if a check had just run (the facts were just read). */
  touch: () => void;
  /** Another entity, or none: a check under way is dropped and its result never applied. */
  reset: () => void;
};

type RecheckerOptions = {
  read: () => Promise<EntityFacts | null>;
  onStart: (manual: boolean) => void;
  onDone: (result: RecheckResult, manual: boolean) => void;
  every?: number;
  now?: () => number;
  visible?: () => boolean;
};

/** Checks again for one entity: one check at a time, at most every `every` on returns, stale results dropped. */
export function createRechecker({
  read,
  onStart,
  onDone,
  every = 10_000,
  now = Date.now,
  visible = () => true,
}: RecheckerOptions): Rechecker {
  let inFlight = false;
  let sequence = 0;
  let last = now();

  const run = (manual: boolean) => {
    if (inFlight) return;
    inFlight = true;
    last = now();
    const id = ++sequence;
    onStart(manual);
    read().then(
      (facts) => {
        if (id !== sequence) return;
        inFlight = false;
        onDone(facts ? { status: 'found', facts } : { status: 'missing' }, manual);
      },
      () => {
        if (id !== sequence) return;
        inFlight = false;
        onDone({ status: 'error' }, manual);
      },
    );
  };

  return {
    run,
    onReturn: () => {
      if (visible() && now() - last > every) run(false);
    },
    touch: () => {
      last = now();
    },
    reset: () => {
      sequence++;
      inFlight = false;
    },
  };
}

type Listener = {
  addEventListener: EventTarget['addEventListener'];
  removeEventListener: EventTarget['removeEventListener'];
};

/** Calls `onReturn` when the visitor comes back to the page (focus, a shown tab, back navigation); returns the cleanup. */
export function listenForReturn(win: Listener, doc: Listener, onReturn: () => void): () => void {
  win.addEventListener('focus', onReturn);
  win.addEventListener('pageshow', onReturn);
  doc.addEventListener('visibilitychange', onReturn);
  return () => {
    win.removeEventListener('focus', onReturn);
    win.removeEventListener('pageshow', onReturn);
    doc.removeEventListener('visibilitychange', onReturn);
  };
}
