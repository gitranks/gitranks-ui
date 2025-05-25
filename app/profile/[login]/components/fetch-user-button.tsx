'use client';

import { useParams } from 'next/navigation';
import { FC } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FetchUserButtonProps = {
  label?: string;
  className?: string;
};

export const FetchUserButton: FC<FetchUserButtonProps> = ({ label = 'Fetch user from GitHub', className }) => {
  // const { data: session } = useSession();
  const params = useParams<{ login: string }>();

  const fetchUser = async () => {
    const res = await fetch(`/api/profile/${params.login}`, { method: 'POST' });

    if (!res.ok) {
      throw new Error('Failed to fetch user');
    }

    return res.json();
  };

  return (
    <Button onClick={fetchUser} className={cn(className)}>
      {label}
    </Button>
  );
};
