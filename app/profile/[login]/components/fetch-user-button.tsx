'use client';

import { RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { usePostHog } from 'posthog-js/react';
import {
  Children,
  cloneElement,
  ComponentProps,
  FC,
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { cn } from '@/lib/utils';
import { ProfileFetchingStatusDocument, UserFetchingStatus } from '@/types/generated/graphql';

type FetchUserButtonProps = {
  className?: string;
  fetchingStatus?: UserFetchingStatus | null;
  fetchingUpdatedAt?: number | null;
  children: ReactElement<ComponentProps<'button'>>;
};

const REFRESH_INTERVAL = 1_000;
const CHECK_STATUS_INTERVAL = 20_000;
const REFRESH_TIMEOUT = 10 * 60 * 1_000;
const FETCH_MESSAGES = ['Fetching…', 'Still fetching 😐', '👀 👀 👀', 'Ping! Still not ready…'];

export const FetchUserButton: FC<FetchUserButtonProps> = ({
  fetchingStatus,
  fetchingUpdatedAt,
  className,
  children,
}) => {
  const { data: session } = useSession();
  const { login } = useParams<{ login: string }>();
  const posthog = usePostHog();
  const fetchAttempt = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingLabel, setLoadingLabel] = useState(FETCH_MESSAGES[fetchAttempt.current]);
  const [fetchingDuration, setFetchingDuration] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (fetchingStatus !== 'FETCHING') {
      return;
    }

    const now = Date.now();
    const initialFetchingDuration = now - (fetchingUpdatedAt || now);

    if (initialFetchingDuration >= REFRESH_TIMEOUT) {
      return;
    }
    // You can determine when and how often to update
    // the time here. In this example we update it only once
    setFetchingDuration(initialFetchingDuration);
  }, [fetchingStatus, fetchingUpdatedAt]);

  const checkFetchingStatus = useCallback(async () => {
    setLoadingLabel('Checking…');
    const data = await graphqlClient(ProfileFetchingStatusDocument, { login });

    if (data.user === null) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setFetchingDuration(null);
      toast.error('User not found on GitHub');
      return;
    }

    if (data.user?.fetchingStatus === 'FETCHING') {
      fetchAttempt.current += 1;
      setLoadingLabel(FETCH_MESSAGES[fetchAttempt.current % FETCH_MESSAGES.length]);
    } else {
      await fetch(`/api/revalidate?tag=${encodeURIComponent(`profile:${login}`)}`);
      window.location.reload();
    }
  }, [login]);

  const fetchUser = async () => {
    setFetchingDuration(0);

    posthog.capture('profile.fetch', { login });

    const res = await fetch(`/api/profile/${login}`, { method: 'POST' });

    if (!res.ok) {
      toast.error('Failed to fetch user profile');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setFetchingDuration(null);
    }
  };

  useEffect(() => {
    if (fetchingDuration === null) {
      return;
    }

    const secondsPassed = Math.floor(fetchingDuration / 1000);
    if (secondsPassed > 0 && secondsPassed % (CHECK_STATUS_INTERVAL / 1000) === 0) {
      checkFetchingStatus();
    }

    if (fetchingDuration >= REFRESH_TIMEOUT) {
      toast.error('Fetching user profile took too long. Please try again later.');
      setFetchingDuration(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      setFetchingDuration((prev) => (prev || 0) + REFRESH_INTERVAL);
    }, REFRESH_INTERVAL);
  }, [fetchingDuration, checkFetchingStatus]);

  const child = Children.only(children);
  const childWithOnClick = cloneElement(child, {
    onClick: session?.user ? fetchUser : undefined,
    disabled: fetchingDuration !== null,
    children:
      fetchingDuration !== null ? (
        <>
          {loadingLabel}
          <ClipLoader loading size={16} />
        </>
      ) : (
        child.props.children
      ),
  });

  const attachDialogIfNeeded = () => {
    if (session?.user) {
      return childWithOnClick;
    }

    return (
      <Dialog>
        <DialogTrigger asChild>{childWithOnClick}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold up — need your OK!</DialogTitle>
            <DialogDescription>
              Fetching a GitHub profile actually fires off around 20–30 GraphQL calls under the hood. That’s no biggie
              for your personal token, but it’d blow through our shared quota.
            </DialogDescription>
            <DialogDescription>Mind signing in with GitHub so we can pull in that user on demand?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Maybe later
              </Button>
            </DialogClose>
            <Button onClick={() => signIn('github')}>Sign in with GitHub</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {attachDialogIfNeeded()}
      {fetchingDuration !== null && (
        <div className="text-xs text-muted-foreground">Time passed: {Math.floor(fetchingDuration / 1000)}s</div>
      )}
    </div>
  );
};

export const FetchUserButtonForNotFoundPage: FC<Omit<FetchUserButtonProps, 'children'>> = (props) => {
  return (
    <FetchUserButton {...props}>
      <Button size="lg">Fetch profile from GitHub</Button>
    </FetchUserButton>
  );
};

export const FetchUserButtonForProfilePage: FC<Omit<FetchUserButtonProps, 'children'>> = (props) => {
  return (
    <FetchUserButton {...props} className={cn('flex-grow', props.className)}>
      <Button size="sm" className="flex-grow">
        Refresh
        <RefreshCw className="size-4" />
      </Button>
    </FetchUserButton>
  );
};
