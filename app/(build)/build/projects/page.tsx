import { BUILD_PLACEHOLDER_METADATA, BuildPlaceholder } from '@/components/build/build-placeholder';

/** All projects, until the page is built. */
export const metadata = BUILD_PLACEHOLDER_METADATA;

export default function BuildProjectsPage() {
  return <BuildPlaceholder title="Projects" />;
}
