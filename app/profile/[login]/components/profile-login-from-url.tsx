'use client';

import { useParams } from 'next/navigation';

export const ProfileLoginFromUrl = () => {
  const params = useParams<{ login: string }>();

  return params.login;
};
