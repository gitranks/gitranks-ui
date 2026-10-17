import { EmptyRanking } from '@/components/empty-ranking/empty-ranking';
import { Link } from '@/components/link/link';

export default function CountryRankingNotFound() {
  return (
    <EmptyRanking>
      This ranking has no entries on this page. Pick another ranking type above, or{' '}
      <Link href="/countries/stars/1">browse all countries</Link>.
    </EmptyRanking>
  );
}
