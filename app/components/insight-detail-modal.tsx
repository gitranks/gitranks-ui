'use client';

import { usePathname, useRouter } from 'next/navigation';

import { InsightDetailContent } from './insight-detail-content';
import { AdaptiveModal } from '@/components/adaptive-modal/adaptive-modal';
import type { InsightQuery } from '@/types/generated/graphql';

type InsightDetailModalProps = {
  insight: NonNullable<InsightQuery['insight']>;
};

export const InsightDetailModal = ({ insight }: InsightDetailModalProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const expectedPathname = `/insights/${insight.id}`;
  const isOpen = pathname === expectedPathname;

  return (
    <AdaptiveModal
      open={isOpen}
      title="Post"
      onOpenChange={(open) => {
        if (!open && pathname === expectedPathname) {
          router.back();
        }
      }}
    >
      <InsightDetailContent insight={insight} />
    </AdaptiveModal>
  );
};
