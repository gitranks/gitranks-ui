import type { HeroBoard, HeroLiveCheck, HeroRefusal } from './admin.types';

export type AdminIntent = 'skip' | 'live-check' | 'schedule' | 'cancel' | 'mark-notified' | 'not-picked';

/** What the last press did: done, refused (with why), or did not go through. */
export type AdminNotice = { intent: AdminIntent; tone: 'done' | 'refused' | 'failed'; text: string };

/**
 * The last live check of this page, for the Schedule dialog: its answer, or why nothing was read. An application's
 * check (`applicationId`) is kept on the application, so it serves only that application's dialog.
 */
export type AdminCheck = {
  repoGithubId: string;
  applicationId?: string | null;
  check: HeroLiveCheck | null;
  refusal: HeroRefusal | null;
};

/** The page: the board as last read, and what the last press answered. */
export type AdminState = { board: HeroBoard; notice: AdminNotice | null; check: AdminCheck | null };

/** One press, as a button's form sends it. */
export type AdminPress =
  | { intent: 'skip'; repoGithubId: string }
  | { intent: 'live-check'; repoGithubId: string; packageName: string | null; applicationId: string | null }
  | {
      intent: 'schedule';
      repoGithubId: string;
      week: string;
      /** The registry as the API names it, `NPM`, `PYPI`: the row's. */
      registry: string;
      name: string;
      line: string;
      reason: string | null;
      text: string;
      /** Off only when the form says `headsUp=false`: anything else sends the heads-up. */
      headsUp: boolean;
      /** Scheduled from an application. */
      applicationId: string | null;
    }
  | { intent: 'cancel' | 'mark-notified' | 'not-picked'; id: string };

const ID = /^[A-Za-z0-9_=+/-]{1,100}$/;
/** Room past the API's own limits, so the API's refusal says what is too long. */
const WORDS_MAX = 2_000;
/** The longest package name of any registry (Maven's `group:artifact`). */
const NAME_MAX = 500;
/** A registry as the API names it. */
const REGISTRY = /^[A-Z]{1,20}$/;

const idOf = (value: FormDataEntryValue | null): string | null =>
  typeof value === 'string' && ID.test(value) ? value : null;

const wordsOf = (value: FormDataEntryValue | null, max = WORDS_MAX): string | null =>
  typeof value === 'string' ? value.slice(0, max) : null;

/** A press from a form; null for anything else (nothing is asked then). */
export function adminPressOf(form: FormData): AdminPress | null {
  const intent = form.get('intent');
  switch (intent) {
    case 'skip': {
      const repoGithubId = idOf(form.get('repoGithubId'));
      return repoGithubId ? { intent, repoGithubId } : null;
    }
    case 'live-check': {
      const repoGithubId = idOf(form.get('repoGithubId'));
      const packageName = wordsOf(form.get('packageName'), NAME_MAX)?.trim() || null;
      const applicationId = idOf(form.get('applicationId'));
      return repoGithubId ? { intent, repoGithubId, packageName, applicationId } : null;
    }
    case 'schedule': {
      const repoGithubId = idOf(form.get('repoGithubId'));
      const week = wordsOf(form.get('week'), 16)?.trim();
      const name = wordsOf(form.get('name'), NAME_MAX)?.trim();
      const registryField = form.get('registry');
      const registry = typeof registryField === 'string' && REGISTRY.test(registryField) ? registryField : null;
      const line = wordsOf(form.get('line'));
      const text = wordsOf(form.get('text'));
      if (!repoGithubId || !week || !registry || !name || line === null || text === null) return null;
      const headsUp = form.get('headsUp') !== 'false';
      const reason = headsUp ? wordsOf(form.get('reason'))?.trim() || null : null;
      const applicationId = idOf(form.get('applicationId'));
      return { intent, repoGithubId, week, registry, name, line, reason, text, headsUp, applicationId };
    }
    case 'cancel':
    case 'mark-notified':
    case 'not-picked': {
      const id = idOf(form.get('id'));
      return id ? { intent, id } : null;
    }
    default:
      return null;
  }
}
