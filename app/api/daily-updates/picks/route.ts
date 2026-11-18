import { bodyOf, callDailyUpdates, json, notSignedIn, tooLarge, viewerOf } from '../api-call';
import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { packageOfKey } from '@/lib/packages/registries';
import type { DailyUpdatesPickResult, DailyUpdatesRemoveResult, PickRef } from '@/types/daily-updates.types';
import { isPickKind, packagePickOf } from '@/utils/daily-updates-view';
import { parseRepoParams } from '@/utils/repo-paths';

/** A repository pick of `owner` and `name`, by the repository page's own rule; `null` when they name none. */
const repoPickOf = (owner: unknown, name: unknown): PickRef | null => {
  const repo = typeof owner === 'string' && typeof name === 'string' ? parseRepoParams(owner, name) : null;
  return repo && { kind: 'repo', name: `${repo.owner}/${repo.name}` };
};

/** A package pick of `<registry>/<name>`, by the registry's rules for names; `null` when it names none. */
const packagePickOfName = (name: string): PickRef | null => {
  const pkg = packageOfKey(name);
  return pkg && packagePickOf(pkg);
};

/**
 * The pick the body names, as `{ kind, name }`: a known kind, for a repository its `owner/name`, for a package its
 * `<registry>/<name>`. Whether the visitor may pick a package is the API's to say. A body of
 * `{ owner, name }` without a kind, as a page loaded before picks had a kind sends it, names a repository. `null` when
 * it names none, `too-large` past the cap.
 */
async function pickOf(req: Request): Promise<PickRef | 'too-large' | null> {
  const body = await bodyOf(req);
  if (body === 'too-large' || !body) {
    return body;
  }

  if (body.kind === undefined) {
    return repoPickOf(body.owner, body.name);
  }
  if (!isPickKind(body.kind) || typeof body.name !== 'string') {
    return null;
  }
  if (body.kind === 'package') {
    return packagePickOfName(body.name);
  }

  const [owner, name, ...rest] = body.name.split('/');
  return rest.length === 0 ? repoPickOf(owner, name) : null;
}

/** Picks a repository or a package to update every day. */
export const POST = auth(async function POST(req: AuthRequest) {
  const viewer = viewerOf(req);
  if (!viewer) {
    return notSignedIn();
  }

  const pick = await pickOf(req);
  if (pick === 'too-large') {
    return tooLarge();
  }
  if (!pick) {
    return json({ message: 'Invalid repository' }, 400);
  }

  const answer = await callDailyUpdates<DailyUpdatesPickResult>(viewer, '/daily-updates/picks', 'POST', pick);
  return answer.ok ? json(answer.body) : json({ message: 'The repo was not added' }, answer.status);
});

/** Removes one of the visitor's picks. */
export const DELETE = auth(async function DELETE(req: AuthRequest) {
  const viewer = viewerOf(req);
  if (!viewer) {
    return notSignedIn();
  }

  const pick = await pickOf(req);
  if (pick === 'too-large') {
    return tooLarge();
  }
  if (!pick) {
    return json({ message: 'Invalid repository' }, 400);
  }

  const answer = await callDailyUpdates<DailyUpdatesRemoveResult>(viewer, '/daily-updates/picks/remove', 'POST', pick);
  return answer.ok ? json(answer.body) : json({ message: 'The repo was not removed' }, answer.status);
});
