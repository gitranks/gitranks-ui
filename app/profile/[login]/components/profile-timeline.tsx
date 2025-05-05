import { compareDesc, parseISO } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { FC } from 'react';

import { Timeline, TimelineDescription, TimelineItem, TimelineTime } from '@/components/timeline/timeline';
import {
  ChangeItemType,
  ChangeSetItemType,
  SocialAccountChangeItem,
  TimelineItemType,
} from '@/types/profile-timeline.types';
import { isObject } from '@/utils/is-object';
import { splitCamelCase } from '@/utils/split-camelcase';

type ProfileTimelineProps = {
  timeline: TimelineItemType[] | null | undefined;
  firstSeenAt?: string;
};

type ProfileTimelineDescriptionProps = {
  type: string;
  changeset: ChangeSetItemType;
};

const parseChangesetItem = (changesetItem: ChangeItemType) => {
  if (isObject<NonNullable<SocialAccountChangeItem>>(changesetItem)) {
    if (!changesetItem.totalCount) {
      return null;
    }

    return changesetItem.nodes
      ?.map((account) => `${account.provider?.toLowerCase()}: ${account.displayName}`)
      .join('; ');
  }

  if (typeof changesetItem === 'number') {
    return changesetItem.toLocaleString('en-US');
  }

  if (!changesetItem) {
    return null;
  }

  return String(changesetItem);
};

const ProfileTimelineDescription: FC<ProfileTimelineDescriptionProps> = ({ type, changeset }) => {
  const before = parseChangesetItem(changeset.b);
  const after = parseChangesetItem(changeset.a);

  if (type === 'avatarUrl') {
    return (
      <div className="flex gap-2">
        <span>Avatar:</span>
        <span>changed</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <span className="shrink-0">{`${splitCamelCase(type)}:`}</span>
      <span>
        {!!before && (
          <span className="opacity-50">
            {before} {!after && '(removed)'}
          </span>
        )}
        {!!before && !!after && <ArrowRight size={12} className="inline" />} {after}
      </span>
    </div>
  );
};

export const ProfileTimeline: FC<ProfileTimelineProps> = ({ timeline, firstSeenAt }) => {
  if (!timeline?.length) {
    return null;
  }

  const sortedTimeline = timeline.sort((a, b) => compareDesc(parseISO(a.createdAt), parseISO(b.createdAt)));

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-xl font-semibold">Timeline</h2>
      <Timeline>
        {sortedTimeline.map((item) => (
          <TimelineItem key={item.createdAt}>
            <TimelineTime isoDate={item.createdAt} />
            <TimelineDescription>
              {Object.entries(item.changes)
                .filter(([, changeset]) => !!changeset.a || !!changeset.b)
                .map(([type, changeset]) => (
                  <ProfileTimelineDescription key={type} type={type} changeset={changeset} />
                ))}
            </TimelineDescription>
          </TimelineItem>
        ))}
        {!!firstSeenAt && (
          <TimelineItem>
            <TimelineTime isoDate={firstSeenAt} />
            <TimelineDescription>First seen</TimelineDescription>
          </TimelineItem>
        )}
      </Timeline>
    </div>
  );
};
