import { Page } from '@/components/page/page';

// import { FetchUserButton } from './components/fetch-user-button';

export default async function NotFound() {
  return (
    <Page className="gap-6 flex-col md:flex-row">
      <div className="flex-grow flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">User not found</h1>
        <p className="text-muted-foreground">The user you are looking for does not exist.</p>
        {/* <FetchUserButton /> */}
      </div>
    </Page>
  );
}
