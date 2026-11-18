import { LinkCard, LinkHead, LinkTroubleCard, PackageName } from './link-page';
import { Link } from '@/components/link/link';
import { Button } from '@/components/ui/button';
import type { FollowPackage } from '@/lib/link-token/follow-links.types';
import { type ConfirmState, FOLLOW_EVENT_LINES, packagesLabelOf } from '@/lib/link-token/follow-pages';

/** The address a link's settings page is at. */
export const FOLLOWING_PATH = '/following';

/** The packages of a link, one per line, when there are several. */
function PackageList({ packages }: Readonly<{ packages: FollowPackage[] }>) {
  if (packages.length < 2) return null;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {packages.map((pkg) => (
        <li key={`${pkg.registry}/${pkg.name}`}>
          <PackageName pkg={pkg} />
        </li>
      ))}
    </ul>
  );
}

type ConfirmViewProps = {
  state: ConfirmState;
  /** The Confirm button's form action; left out where nothing can be pressed (the catalogue, a spec). */
  action?: (form: FormData) => void;
  pending?: boolean;
};

/**
 * `/follow/confirm`: what a confirmation link would confirm, and one button. Nothing is confirmed until the press;
 * after it, the packages followed and a link to the address's settings.
 */
export function ConfirmView({ state, action, pending = false }: Readonly<ConfirmViewProps>) {
  switch (state.kind) {
    case 'pending': {
      const label = packagesLabelOf(state.packages);
      const lines = FOLLOW_EVENT_LINES.filter(({ key }) => state.events?.[key]);
      return (
        <LinkCard>
          <LinkHead eyebrow="Confirm your email" title={`Confirm updates about ${label}`} />
          <PackageList packages={state.packages} />
          {lines.length > 0 && (
            <div className="flex flex-col gap-2 text-sm">
              <p>We will email you:</p>
              <ul className="list-disc space-y-1 pl-5">
                {lines.map(({ key, line }) => (
                  <li key={key}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <form action={action} className="flex flex-col gap-3">
            <Button type="submit" disabled={pending} className="max-sm:min-h-11 sm:self-start">
              Confirm
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Nothing is followed until you press Confirm. Every email lets you unfollow.
          </p>
        </LinkCard>
      );
    }
    case 'confirmed': {
      const label = packagesLabelOf(state.packages);
      return (
        <LinkCard>
          <LinkHead eyebrow="Confirmed" title={`You follow ${label}`} />
          <PackageList packages={state.packages} />
          <p className="text-sm">
            We will email you about {state.packages.length > 1 ? 'them' : 'it'} as you asked.
            {state.settings && (
              <>
                {' '}
                Change what you get, or unfollow, in <Link href={FOLLOWING_PATH}>Email settings</Link>.
              </>
            )}
          </p>
        </LinkCard>
      );
    }
    case 'already-confirmed':
      return (
        <LinkCard>
          <LinkHead title="Already confirmed" />
          <p className="text-sm">
            You follow {packagesLabelOf(state.packages)}. To change what you get, open Email settings from any email
            about it.
          </p>
        </LinkCard>
      );
    case 'expired':
      return (
        <LinkCard>
          <LinkHead title="This link has expired" />
          <p className="text-sm text-muted-foreground">
            A confirmation link works for 7 days. Follow the package again from its page on GitRanks to get a new one.
          </p>
        </LinkCard>
      );
    default:
      return (
        <LinkTroubleCard
          trouble={state}
          unknownText="Open it from your email again, or follow the package again from its page on GitRanks."
        />
      );
  }
}
