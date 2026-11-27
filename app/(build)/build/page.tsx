import { BUILD_PLACEHOLDER_METADATA, BuildPlaceholder } from '@/components/build/build-placeholder';

/** Build's home, until its page is built. */
export const metadata = BUILD_PLACEHOLDER_METADATA;

export default function BuildHomePage() {
  return <BuildPlaceholder title="Build" />;
}
