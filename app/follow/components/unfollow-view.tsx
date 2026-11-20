import { LinkCard, LinkHead, LinkTroubleCard, PackageName } from './link-page';
import { Button } from '@/components/ui/button';
import { packageLabelOf, type UnfollowState } from '@/lib/link-token/follow-pages';

type UnfollowViewProps = {
  state: UnfollowState;
  /** The buttons' form action; left out where nothing can be pressed (the catalogue, a spec). */
  action?: (form: FormData) => void;
  pending?: boolean;
};

/**
 * `/follow/unfollow`: the follow an email's Unfollow link names, and one button. Nothing changes until the press;
 * after it, Undo for the 7 days the follow is kept.
 */
export function UnfollowView({ state, action, pending = false }: Readonly<UnfollowViewProps>) {
  if (state.kind !== 'follow') {
    return (
      <LinkTroubleCard
        trouble={state}
        unknownText="This follow may have been removed already. Open the link from your latest email about the package."
      />
    );
  }

  const { follow, addressHint } = state;
  const label = packageLabelOf(follow.package);

  if (follow.status === 'REMOVED') {
    return (
      <LinkCard>
        <LinkHead eyebrow="Unfollowed" title={`You unfollowed ${label}`} />
        {state.note === 'undo-refused' ? (
          <p
            role="status"
            className="rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-soft-foreground"
          >
            Could not follow {label} again: the address may already follow as many packages as it can, or the follow is
            gone. Follow it again from its page on GitRanks.
          </p>
        ) : (
          <p className="text-sm">
            We will not email {addressHint} about <PackageName pkg={follow.package} /> again. Changed your mind? You can
            undo this for 7 days.
          </p>
        )}
        {!state.note && (
          <form action={action}>
            <Button
              type="submit"
              name="change"
              value="undo"
              variant="outline"
              disabled={pending}
              className="max-sm:min-h-11"
            >
              Undo
            </Button>
          </form>
        )}
      </LinkCard>
    );
  }

  return (
    <LinkCard>
      <LinkHead eyebrow={state.note === 'undone' ? 'Following again' : 'Unfollow'} title={`Unfollow ${label}?`} />
      <p className="text-sm">
        {state.note === 'undone' ? 'You follow it again. ' : ''}
        We email {addressHint} about it. Unfollow, and we stop.
      </p>
      <form action={action}>
        <Button type="submit" name="change" value="remove" disabled={pending} className="max-sm:min-h-11">
          Unfollow
        </Button>
      </form>
    </LinkCard>
  );
}
