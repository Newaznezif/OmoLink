import { MarketplaceView } from '@/components/marketplace';

export default async function ExplorePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <MarketplaceView
      searchParams={searchParams}
      eyebrowKey={'market.exploreEyebrow'}
      titleKey={'market.exploreTitle'}
      descriptionKey={'market.exploreDescription'}
    />
  );
}
