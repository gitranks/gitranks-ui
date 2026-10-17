import { MapPin } from 'lucide-react';

import { ProfileListItem } from './profile-list-item';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';

type ProfileLocationProps = {
  location: string;
  country?: string | null;
  countryFlag?: string | null;
};

/** The profile's location, linked to its country's ranking when that country has one. */
export async function ProfileLocation({ location, country, countryFlag }: ProfileLocationProps) {
  const countries = country ? await fetchCountries() : [];
  const hasRanking = !!country && countries.some((c) => c.name === country);

  return (
    <ProfileListItem
      value={`${countryFlag ? `${countryFlag} ` : ''}${location}`}
      url={hasRanking ? `/country/${encodeURIComponent(country)}/stars/1` : undefined}
      Icon={MapPin}
    />
  );
}
