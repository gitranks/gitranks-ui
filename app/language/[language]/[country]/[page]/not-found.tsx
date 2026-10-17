import { EmptyRanking } from '@/components/empty-ranking/empty-ranking';
import { Link } from '@/components/link/link';

export default function LanguageRankingNotFound() {
  return (
    <EmptyRanking>
      This language has no ranked developers on this page. Pick another country above, or{' '}
      <Link href="/languages/global/score/1">browse all languages</Link>.
    </EmptyRanking>
  );
}
