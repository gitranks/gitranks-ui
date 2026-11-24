import Link from 'next/link';

import { ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import {
  type EntityRow,
  entityHeadOf,
  entityNumberOf,
  entityRowsOf,
  type LearnEntity,
  type LearnEntityCard as LearnEntityCardData,
} from '@/lib/learn/entity-card';

/** One row: the whole row is a link, its words on the right say where it leads (under the text on a phone). */
function Row({ row }: { row: EntityRow }) {
  return (
    <li>
      <Link
        href={row.href}
        prefetch={false}
        data-entity-row={row.id}
        className="flex flex-col gap-1.5 px-4 py-3 hover:bg-accent sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {row.title.map((part, index) =>
              typeof part === 'number' ? (
                <span key={index} className="font-mono tabular-nums">
                  {entityNumberOf(part)}
                </span>
              ) : (
                part
              ),
            )}
          </span>
          <span className="text-sm text-muted-foreground">{row.text}</span>
        </span>
        <span className="shrink-0 text-sm font-medium whitespace-nowrap text-link">
          {row.action} <span aria-hidden="true">→</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * The Learn card on a repository's and an organisation's page: a title, one line that names GitRanks Learn, then one
 * row for each thing Learn has about the project. With no row there is no card, so the page is as it was. The same
 * for a visitor and a signed-in person.
 */
export function LearnEntityCard({ card, entity }: { card: LearnEntityCardData | null; entity: LearnEntity }) {
  const rows = entityRowsOf(card, entity);
  if (!rows.length) return null;
  const head = entityHeadOf(entity);
  return (
    <ProfileCard className="gap-3">
      <div className="flex min-w-0 flex-col gap-1" data-learn-entity={entity.kind}>
        <ProfileCardHeader>
          <h2>{head.title}</h2>
        </ProfileCardHeader>
        <p className="text-sm text-muted-foreground">{head.line}</p>
      </div>
      <ul className="m-0 list-none divide-y overflow-hidden rounded-lg border p-0">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>
    </ProfileCard>
  );
}
