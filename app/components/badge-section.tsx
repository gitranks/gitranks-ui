import { Link } from '@/components/link/link';

export const BadgeSection = () => {
  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold">Put Your GitHub Rank on Display</h2>
      <div>
        Show off your coding achievements with a dynamic GitHub badge. Let the world see exactly where you stand among
        millions of developers.
      </div>
      <div>
        <Link href="/badge">Create a badge</Link>
      </div>
    </div>
  );
};
