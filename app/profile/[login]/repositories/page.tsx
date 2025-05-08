import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { fetchProfileData } from '../utils/fetch-profile-data';

export default async function ProfileRepositories({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  return <LayoutLeftColumn user={user}>🚧 The repositories should be up in a couple of days 🚧</LayoutLeftColumn>;
}
