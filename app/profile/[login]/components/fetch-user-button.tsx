'use client';

import { useParams } from 'next/navigation';
import { FC } from 'react';

import { Button } from '@/components/ui/button';

type FetchUserButtonProps = {
  label?: string;
};

export const FetchUserButton: FC<FetchUserButtonProps> = ({ label = 'Fetch user from GitHub' }) => {
  const params = useParams<{ login: string }>();

  const fetchUser = async () => {
    const res = await fetch(`/api/profile/${params.login}`, { method: 'POST' });

    if (!res.ok) {
      throw new Error('Failed to fetch user');
    }

    return res.json();
  };

  return <Button onClick={fetchUser}>{label}</Button>;
};
