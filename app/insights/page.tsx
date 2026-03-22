import { InsightsList } from './insights-list';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchInsights } from '@/graphql/helpers/fetch-insights';

export default async function InsightsPage() {
  const { insights = [] } = await fetchInsights({ skip: 0, limit: 20 });

  return (
    <>
      <Header />
      <Page className="gap-4">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <InsightsList initialInsights={insights} />
      </Page>
    </>
  );
}
