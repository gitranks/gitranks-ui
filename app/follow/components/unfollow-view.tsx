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
        <p className="text-sm">
          We will not email {addressHint} about <PackageName pkg={follow.package} /> again. Changed your mind? You can
          undo this for 7 days.
        </p>
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
      </LinkCard>
    );
  }

  return (
    <LinkCard>
      <LinkHead eyebrow={state.undone ? 'Following again' : 'Unfollow'} title={`Unfollow ${label}?`} />
      <p className="text-sm">
        {state.undone ? 'You follow it again. ' : ''}
        {follow.status === 'PENDING'
          ? `This follow is waiting for its confirmation at ${addressHint}.`
          : `We email ${addressHint} about it.`}{' '}
        Unfollow, and we stop.
      </p>
      <form action={action}>
        <Button type="submit" name="change" value="remove" disabled={pending} className="max-sm:min-h-11">
          Unfollow
        </Button>
      </form>
    </LinkCard>
  );
}
