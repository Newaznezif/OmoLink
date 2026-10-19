import { MarketplaceView } from '@/components/marketplace';

export default async function TourismPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <MarketplaceView
      searchParams={searchParams}
      kind="service"
      eyebrowKey={'market.tourismEyebrow'}
      titleKey={'market.tourismTitle'}
      descriptionKey={'market.tourismDescription'}
    />
  );
}
