import { ComponentType, FC } from 'react';

type ProfileListItemProps = {
  value?: string | number | null;
  Icon: ComponentType<{ size: number; className?: string }>;
};

export const ProfileListItem: FC<ProfileListItemProps> = ({ value, Icon }) => {
  if (!value) {
    return null;
  }

  return (
    <div className="flex gap-2 items-center break-all">
      <Icon size={20} className="shrink-0" />
      {value}
    </div>
  );
};
