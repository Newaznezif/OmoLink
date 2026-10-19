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
      eyebrowKey={'market.productsEyebrow'}
      titleKey={'market.productsTitle'}
      descriptionKey={'market.productsDescription'}
    />
  );
}
