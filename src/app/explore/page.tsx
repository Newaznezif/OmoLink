import { MarketplaceView } from '@/components/marketplace';

export default async function ExplorePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <MarketplaceView
      searchParams={searchParams}
      eyebrow="Explore"
      title="Browse everything"
      description="Search across products and services, filter by community and category, and inspect producer information."
    />
  );
}
