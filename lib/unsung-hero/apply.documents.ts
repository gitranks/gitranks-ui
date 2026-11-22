import { parse } from 'graphql';

import type { ApplyAnswer, ApplyResolved, ApplySendInput, HeroApplyView } from './apply.types';
import type DocumentNode from '@/types/typed-document-node';

/**
 * The apply page's operations, written out here rather than in `.gql` files, as the other Unsung hero operations are:
 * the fields are newer than the generated schema, and an API that does not answer them yet fails only these.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const PACKAGE = 'registry name displayName repository downloads downloadsPer dependents';
const APPLICATION = `status package { ${PACKAGE} } typed note sentAt week { startsAt endsAt }`;
const ANSWER = `ok refusal application { ${APPLICATION} }`;

/** The page's one read: the registries for everyone; signed in, the viewer, their application and their packages. */
export const HeroApplyDocument = doc<{ heroApply: HeroApplyView }>(
  `query HeroApply {
    heroApply {
      registries { id label }
      viewer { login }
      application { ${APPLICATION} }
      packages { ${PACKAGE} }
    }
  }`,
);

/** The registries alone: what a visitor's page shows. */
export const HeroApplyRegistriesDocument = doc<{ heroApply: Pick<HeroApplyView, 'registries'> }>(
  `query HeroApplyRegistries {
    heroApply { registries { id label } }
  }`,
);

/** A typed name or registry link, looked up; null for a visitor. */
export const HeroApplyResolveDocument = doc<{ heroApplyResolve: ApplyResolved | null }, { input: string }>(
  `query HeroApplyResolve($input: String!) {
    heroApplyResolve(input: $input) { status packages { ${PACKAGE} } }
  }`,
);

export const HeroApplySendDocument = doc<{ heroApplySend: ApplyAnswer }, { input: ApplySendInput }>(
  `mutation HeroApplySend($input: HeroApplySendInput!) {
    heroApplySend(input: $input) { ${ANSWER} }
  }`,
);

export const HeroApplyCancelDocument = doc<{ heroApplyCancel: ApplyAnswer }>(
  `mutation HeroApplyCancel {
    heroApplyCancel { ${ANSWER} }
  }`,
);
