import { MarketplaceView } from '@/components/marketplace';

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <MarketplaceView
      searchParams={searchParams}
      kind="product"
      eyebrow="Marketplace"
      title="Products"
      description="Sample product listings from South Omo producers. Categories are illustrative and do not prove that a product is available in any specific community."
    />
  );
}
