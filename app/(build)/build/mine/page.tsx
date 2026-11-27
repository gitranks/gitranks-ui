import { BUILD_PLACEHOLDER_METADATA, BuildPlaceholder } from '@/components/build/build-placeholder';

/** My builds, until the page is built. */
export const metadata = BUILD_PLACEHOLDER_METADATA;

export default function BuildMinePage() {
  return <BuildPlaceholder title="My builds" />;
}
