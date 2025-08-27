'use client';
import { FC } from 'react';

import { ButtonGroup, ButtonGroupItem } from '@/components/button-group/button-group';

export const RankCardSwitcher: FC<{ className?: string }> = ({ className }) => {
  return (
    <ButtonGroup
      className={className}
      // style={{
      //   position: 'absolute',
      //   top: '-2px',
      //   right: '-2px',
      //   borderBottomRightRadius: '0',
      //   borderTopLeftRadius: '0',
      // }}
    >
      <ButtonGroupItem onClick={() => {}} active>
        Global
      </ButtonGroupItem>
      <ButtonGroupItem onClick={() => {}}>United Kingdom</ButtonGroupItem>
    </ButtonGroup>
  );
};
