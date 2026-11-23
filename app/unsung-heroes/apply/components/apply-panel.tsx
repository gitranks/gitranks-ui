'use client';

import { useEffect, useState } from 'react';

import { ApplicationCard } from './application-card';
import { ApplyForm, type ApplyFormStart } from './apply-form';
import { type HeroApplication, type HeroApplyView, isOpenApplication } from '@/lib/unsung-hero/apply.types';
import { forgetHeroApplication, rememberHeroApplication } from '@/lib/unsung-hero/hero-application-cookie';

/**
 * The signed-in right column: the viewer's application while there is one to show, else the form. A closed one (not
 * picked, featured) gives way to the form on "Send a new application". The browser's note of an open application
 * follows what this shows: set while an application is open, cleared when none is.
 */
export function ApplyPanel({
  login,
  view,
  emailed = false,
  start,
}: Readonly<{ login: string; view: HeroApplyView; emailed?: boolean; start?: ApplyFormStart }>) {
  const [application, setApplication] = useState<HeroApplication | null>(view.application);
  const [applyingAgain, setApplyingAgain] = useState(false);
  const open = isOpenApplication(application);

  useEffect(() => {
    if (open) rememberHeroApplication(login);
    else forgetHeroApplication();
  }, [open, login]);

  if (application && (open || !applyingAgain)) {
    return (
      <ApplicationCard
        application={application}
        registries={view.registries}
        emailed={emailed}
        onCancelled={() => setApplication(null)}
        onApplyAgain={() => setApplyingAgain(true)}
      />
    );
  }
  return (
    <ApplyForm
      registries={view.registries}
      packages={view.packages}
      start={start}
      onSent={(sent) => {
        setApplication(sent);
        setApplyingAgain(false);
      }}
    />
  );
}
