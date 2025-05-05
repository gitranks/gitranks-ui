'use client';

import { RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

export const RefreshButton = () => {
  const { login } = useParams();
  const posthog = usePostHog();

  const handleRefresh = async () => {
    toast.info('🚧 This feature is still under construction!', {
      description:
        "I'm wrestling bugs, chugging coffee, and coding like a caffeinated squirrel to make it happen. Want to lend a hand or just say hi? Catch me on GitHub!",
    });

    posthog.capture('landingPage.search', { login });
  };

  return (
    <Button size="sm" className="flex-grow" onClick={handleRefresh}>
      Refresh
      <RefreshCw className="size-4" />
    </Button>
  );
};
