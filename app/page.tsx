import SigninButton from '@/components/signin-button/signin-button';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-6xl">GitRanks</h1>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a className="flex items-center gap-2 hover:underline hover:underline-offset-4" href="/by/owned-stars">
            by owned stars
          </a>
          <a className="flex items-center gap-2 hover:underline hover:underline-offset-4" href="/by/contributed-stars">
            by contributed stars
          </a>
          <a className="flex items-center gap-2 hover:underline hover:underline-offset-4" href="/by/followers">
            by followers
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <SigninButton />
      </footer>
    </div>
  );
}
