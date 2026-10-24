import { MapPin } from 'lucide-react';

import { ProfileListItem } from './profile-list-item';
import { Flag } from '@/components/flag/flag';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';

type ProfileLocationProps = {
  location: string;
  country?: string | null;
  countryFlag?: string | null;
};

/** The profile's location, linked to its country's ranking when that country has one. */
export async function ProfileLocation({ location, country, countryFlag }: ProfileLocationProps) {
  // The link is optional: if the country list can't load, show the location as plain text.
  const countries = country ? await fetchCountries().catch(() => []) : [];
  const hasRanking = !!country && countries.some((c) => c.name === country);

  return (
    <ProfileListItem
      value={location}
      prefix={<Flag flag={countryFlag} className="me-1.5" />}
      url={hasRanking ? `/country/${encodeURIComponent(country)}/stars/1` : undefined}
      Icon={MapPin}
    />
  );
}
