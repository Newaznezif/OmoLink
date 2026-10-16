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
      eyebrow="Tourism"
      title="Tourism services"
      description="Guided visits, half-day walks and craft demonstrations offered by locally operated producers and guides. Sensitive cultural knowledge is never commercialised by default."
    />
  );
}
