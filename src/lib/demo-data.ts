import type {
  Category,
  CollectiveOpportunity,
  GroupContribution,
  Inquiry,
  Listing,
  ListingImage,
  ListingReport,
  ProducerGroup,
  Profile,
  Review,
  TransportPlan,
  VerificationReview
} from './types';

/**
 * Realistic seed content for OmoLink. Every record here is a sample. Producers,
 * communities, prices and quantities do not represent real verified market
 * data. In demo mode the UI labels every sample record explicitly.
 *
 * Categories are configurable and are provided as examples. They must not be
 * presented as proof that a specific product is available in a specific
 * community.
 */

export function buildSeed() {
  const now = new Date().toISOString();
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  const categories: Category[] = [
    { id: 'cat_handicraft', slug: 'handicrafts', name: 'Handicrafts', kind: 'product', description: 'Baskets, jewellery, pottery, woodwork and other handmade items.' },
    { id: 'cat_honey', slug: 'honey-local-foods', name: 'Honey and local foods', kind: 'product', description: 'Forest honey, spices, grains and other local foods.' },
    { id: 'cat_dairy', slug: 'dairy-agri', name: 'Dairy and agricultural products', kind: 'product', description: 'Milk, butter, cheese, meat and other farm products.' },
    { id: 'cat_textile', slug: 'textiles', name: 'Textiles and traditional products', kind: 'product', description: 'Woven cloth, hides, garments and accessories.' },
    { id: 'cat_tourism', slug: 'tourism-experiences', name: 'Tourism experiences', kind: 'service', description: 'Multi-day visits, cultural landscape tours and community-run experiences.' },
    { id: 'cat_guided', slug: 'guided-visits', name: 'Guided visits', kind: 'service', description: 'Half-day and full-day walks with a local guide.' },
    { id: 'cat_craft_demo', slug: 'craft-demonstrations', name: 'Craft demonstrations', kind: 'service', description: 'Sessions where producers show a craft process to small groups.' },
    { id: 'cat_other', slug: 'other-services', name: 'Other locally verified services', kind: 'both', description: 'Community-verified services that do not fit the categories above.' }
  ];

  const profiles: Profile[] = [
    {
      id: 'prof_artisan_basket',
      userId: 'demo_user_basket',
      displayName: 'Sample basket-weaver profile (South Omo)',
      producerType: 'artisan',
      community: 'Sample community — Jinka woreda (illustrative)',
      operatingArea: 'Jinka and nearby markets',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio:
        'Demonstrates a producer profile for a basket-weaving artisan. All names, communities and prices on this listing are sample data.',
      categories: ['cat_handicraft', 'cat_craft_demo'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: 'Verification workflow is pending pilot design. This sample is intentionally unverified.',
      groupIds: ['grp_women_baskets'],
      createdAt: daysAgo(120),
      updatedAt: daysAgo(3),
      isDemo: true
    },
    {
      id: 'prof_honey_group',
      userId: 'demo_user_honey',
      displayName: 'Sample honey producers group',
      producerType: 'producer_group',
      community: 'Sample community — Debub Omo area (illustrative)',
      operatingArea: 'Debre Tsinat market and surrounding villages',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio:
        'Demonstrates a producer-group account that pools forest honey from several households. Sample data only.',
      categories: ['cat_honey', 'cat_dairy'],
      consentToPublish: true,
      verification: 'pending_review',
      verificationNote: 'Awaiting pilot reviewer. Do not present this as a real verified status.',
      groupIds: ['grp_honey_pool'],
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
      isDemo: true
    },
    {
      id: 'prof_guide_local',
      userId: 'demo_user_guide',
      displayName: 'Sample local guide profile',
      producerType: 'guide',
      community: 'Sample community — Key Afer area (illustrative)',
      operatingArea: 'South Omo valley markets and highland walks',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio:
        'Demonstrates a locally operated guide profile. Sample data only; no real person is represented.',
      categories: ['cat_tourism', 'cat_guided'],
      consentToPublish: true,
      verification: 'unverified',
      groupIds: [],
      createdAt: daysAgo(60),
      updatedAt: daysAgo(7),
      isDemo: true
    },
    {
      id: 'prof_textile_household',
      userId: 'demo_user_textile',
      displayName: 'Sample textile household',
      producerType: 'household',
      community: 'Sample community — Arbaminch area (illustrative)',
      operatingArea: 'Arbaminch and nearby weekly markets',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio: 'Demonstrates a household account selling woven cotton shawls and hide goods. Sample data only.',
      categories: ['cat_textile'],
      consentToPublish: true,
      verification: 'unverified',
      groupIds: ['grp_women_baskets'],
      createdAt: daysAgo(45),
      updatedAt: daysAgo(10),
      isDemo: true
    },
    {
      id: 'prof_admin',
      userId: 'demo_user_admin',
      displayName: 'Sample authorised reviewer',
      producerType: 'other',
      community: 'Platform administration (sample)',
      operatingArea: 'Remote',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio: 'Demonstrates an administrator account used to review verification requests and reports in demo mode. All actions are simulated.',
      categories: [],
      consentToPublish: true,
      verification: 'verified',
      verificationNote: 'Simulated admin. Do not treat this as a real authorised reviewer.',
      groupIds: [],
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
      isDemo: true
    },
    {
      id: 'prof_dairy_farmer',
      userId: 'demo_user_dairy',
      displayName: 'Sample smallholder dairy farmer',
      producerType: 'farmer',
      community: 'Sample community — Boloso Sore area (illustrative)',
      operatingArea: 'Weekly market days only',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio: 'Demonstrates a smallholder dairy producer listing. Sample data only.',
      categories: ['cat_dairy'],
      consentToPublish: true,
      verification: 'unverified',
      groupIds: ['grp_honey_pool'],
      createdAt: daysAgo(30),
      updatedAt: daysAgo(2),
      isDemo: true
    }
  ];

  const svgImage = (title: string, tint: string, alt: string, caption: string, listingId: string, id: string): ListingImage => ({
    id,
    listingId,
    src: buildPlaceholder(tint, title),
    alt,
    caption,
    consentRecorded: true,
    isSample: true
  });

  const listings: Listing[] = [
    {
      id: 'lst_basket_set',
      slug: 'sample-handwoven-storage-basket-set',
      kind: 'product',
      title: 'Sample handwoven storage basket set (3 sizes)',
      description:
        'Sample listing to demonstrate how a producer presents a set of handwoven baskets. Prices, quantities and availability shown here are illustrative and must not be quoted to buyers.',
      categoryId: 'cat_handicraft',
      producerId: 'prof_artisan_basket',
      community: 'Sample community — Jinka woreda (illustrative)',
      unitPrice: { cents: 12_500, currency: 'ETB' },
      unitOfSale: 'bundle',
      availableQuantity: 24,
      minOrderQuantity: 1,
      availability: 'available',
      pickupOptions: ['Weekly market day pickup', 'Buyer arranges transport'],
      deliveryAvailable: false,
      lastUpdated: daysAgo(3),
      createdAt: daysAgo(80),
      verification: 'unverified',
      published: true,
      images: [
        svgImage('Baskets', '#c99a1b', 'Illustrative placeholder for a set of handwoven baskets. Not a documentary photo.', 'Placeholder image — not a photo of a real product', 'lst_basket_set', 'img_basket_1')
      ],
      isDemo: true
    },
    {
      id: 'lst_forest_honey',
      slug: 'sample-forest-honey-500g-jar',
      kind: 'product',
      title: 'Sample forest honey, 500g jar',
      description:
        'Sample listing showing how a producer group lists honey by jar with transparent unit price and stock. Numbers are illustrative.',
      categoryId: 'cat_honey',
      producerId: 'prof_honey_group',
      community: 'Sample community — Debub Omo area (illustrative)',
      unitPrice: { cents: 6_800, currency: 'ETB' },
      unitOfSale: 'item',
      availableQuantity: 140,
      minOrderQuantity: 6,
      availability: 'available',
      pickupOptions: ['Group pickup point', 'Bulk delivery to Jinka'],
      deliveryAvailable: true,
      lastUpdated: daysAgo(1),
      createdAt: daysAgo(60),
      verification: 'pending_review',
      published: true,
      images: [
        svgImage('Honey', '#b96a2c', 'Illustrative placeholder for a honey jar. Not a documentary photo.', 'Placeholder image — sample data only', 'lst_forest_honey', 'img_honey_1')
      ],
      isDemo: true
    },
    {
      id: 'lst_cotton_shawl',
      slug: 'sample-woven-cotton-shawl',
      kind: 'product',
      title: 'Sample woven cotton shawl',
      description: 'Sample listing demonstrating textile products with per-item pricing and made-to-order stock state.',
      categoryId: 'cat_textile',
      producerId: 'prof_textile_household',
      community: 'Sample community — Arbaminch area (illustrative)',
      unitPrice: { cents: 15_000, currency: 'ETB' },
      unitOfSale: 'item',
      availableQuantity: 0,
      minOrderQuantity: 1,
      availability: 'made_to_order',
      pickupOptions: ['Weekly market pickup'],
      deliveryAvailable: false,
      lastUpdated: daysAgo(10),
      createdAt: daysAgo(40),
      verification: 'unverified',
      published: true,
      images: [svgImage('Shawl', '#dfa773', 'Illustrative placeholder for a woven shawl. Not a documentary photo.', 'Placeholder image — sample data only', 'lst_cotton_shawl', 'img_shawl_1')],
      isDemo: true
    },
    {
      id: 'lst_milk_butter',
      slug: 'sample-butter-1kg-block',
      kind: 'product',
      title: 'Sample clarified butter, 1 kg block',
      description: 'Sample listing to demonstrate dairy products with kilogram pricing.',
      categoryId: 'cat_dairy',
      producerId: 'prof_dairy_farmer',
      community: 'Sample community — Boloso Sore area (illustrative)',
      unitPrice: { cents: 9_500, currency: 'ETB' },
      unitOfSale: 'kg',
      availableQuantity: 40,
      minOrderQuantity: 2,
      availability: 'seasonal',
      pickupOptions: ['Weekly market pickup'],
      deliveryAvailable: false,
      lastUpdated: daysAgo(2),
      createdAt: daysAgo(20),
      verification: 'unverified',
      published: true,
      images: [svgImage('Butter', '#f9eabd', 'Illustrative placeholder for a block of clarified butter. Not a documentary photo.', 'Placeholder image — sample data only', 'lst_milk_butter', 'img_butter_1')],
      isDemo: true
    },
    {
      id: 'lst_valley_walk',
      slug: 'sample-half-day-valley-walk',
      kind: 'service',
      title: 'Sample half-day valley walk with a local guide',
      description:
        'Sample tourism service showing how a guide lists a half-day walk with transparent pricing per person and clear inclusions and exclusions.',
      categoryId: 'cat_guided',
      producerId: 'prof_guide_local',
      community: 'Sample community — Key Afer area (illustrative)',
      unitPrice: { cents: 1_800_00, currency: 'ETB' },
      unitOfSale: 'person',
      availableQuantity: 12,
      minOrderQuantity: 1,
      availability: 'available',
      pickupOptions: ['Meet at guide point'],
      deliveryAvailable: false,
      lastUpdated: daysAgo(7),
      createdAt: daysAgo(50),
      verification: 'unverified',
      published: true,
      tourism: {
        packageName: 'Half-day valley walk (sample)',
        durationHours: 4,
        groupCapacity: 6,
        inclusions: ['Local guide', 'Drinking water'],
        exclusions: ['Transport to meeting point', 'Lunch'],
        bookingConditions: 'Book at least 24 hours in advance. Group size capped at 6.',
        meetingPoint: 'Sample meeting point (illustrative) near Key Afer market.',
        cancellationPolicy: 'Free reschedule if 24+ hours in advance.'
      },
      images: [svgImage('Walk', '#5d7d4a', 'Illustrative placeholder for a valley walk. Not a documentary photo.', 'Placeholder image — sample data only', 'lst_valley_walk', 'img_walk_1')],
      isDemo: true
    },
    {
      id: 'lst_craft_session',
      slug: 'sample-basket-weaving-demo',
      kind: 'service',
      title: 'Sample basket-weaving demonstration session',
      description:
        'Sample craft demonstration listing where the artisan shows the weaving process. Sensitive cultural knowledge is NOT commercialised here — only the practical weaving demonstration.',
      categoryId: 'cat_craft_demo',
      producerId: 'prof_artisan_basket',
      community: 'Sample community — Jinka woreda (illustrative)',
      unitPrice: { cents: 500_00, currency: 'ETB' },
      unitOfSale: 'person',
      availableQuantity: 8,
      minOrderQuantity: 2,
      availability: 'limited',
      pickupOptions: ['Host homestead pickup point'],
      deliveryAvailable: false,
      lastUpdated: daysAgo(3),
      createdAt: daysAgo(35),
      verification: 'unverified',
      published: true,
      tourism: {
        packageName: 'Basket-weaving demonstration (sample)',
        durationHours: 2,
        groupCapacity: 8,
        inclusions: ['Demonstration', 'Optional take-home mini basket'],
        exclusions: ['Transport'],
        bookingConditions: 'Small groups only. Advance notice requested.',
        meetingPoint: 'Sample community meeting point.',
        cancellationPolicy: 'Reschedule allowed on notice.'
      },
      images: [svgImage('Craft', '#dfa773', 'Illustrative placeholder for a craft demonstration. Not a documentary photo.', 'Placeholder image — sample data only', 'lst_craft_session', 'img_craft_1')],
      isDemo: true
    }
  ];

  const groups: ProducerGroup[] = [
    {
      id: 'grp_women_baskets',
      name: 'Sample women’s weaving group',
      community: 'Sample community — Jinka area (illustrative)',
      description: 'Demonstrates how several households pool basket production for larger orders.',
      coordinatorProfileId: 'prof_artisan_basket',
      memberProfileIds: ['prof_artisan_basket', 'prof_textile_household'],
      createdAt: daysAgo(120),
      isDemo: true
    },
    {
      id: 'grp_honey_pool',
      name: 'Sample honey pooling group',
      community: 'Sample community — Debub Omo area (illustrative)',
      description: 'Demonstrates a group pooling honey supply for bulk buyers such as hotels and retailers.',
      coordinatorProfileId: 'prof_honey_group',
      memberProfileIds: ['prof_honey_group', 'prof_dairy_farmer'],
      createdAt: daysAgo(90),
      isDemo: true
    }
  ];

  const opportunities: CollectiveOpportunity[] = [
    {
      id: 'col_honey_bulk',
      slug: 'sample-hotel-honey-order',
      title: 'Sample bulk honey order for a Jinka hotel',
      description:
        'Demonstrates a collective opportunity where a group pools honey supply to fulfil a hotel order. All quantities and prices are illustrative.',
      categoryId: 'cat_honey',
      unitOfSale: 'kg',
      organizingGroupId: 'grp_honey_pool',
      coordinatorProfileId: 'prof_honey_group',
      targetQuantity: 200,
      aggregateQuantity: 0,
      indicativeGroupPrice: { cents: 12_000, currency: 'ETB' },
      pickupPlan: 'Coordinated pickup at the group meeting point on the last Saturday of the month.',
      transportPlan: 'Shared minibus to Jinka; cost split by contributed kilograms.',
      orderDeadline: new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10),
      status: 'open',
      createdAt: daysAgo(15),
      updatedAt: daysAgo(1),
      isDemo: true
    },
    {
      id: 'col_basket_retail',
      slug: 'sample-retail-basket-order',
      title: 'Sample retail basket order for an Addis shop',
      description:
        'Demonstrates how a weaving group can pool basket inventory for a bulk retail order. Sample numbers only.',
      categoryId: 'cat_handicraft',
      unitOfSale: 'bundle',
      organizingGroupId: 'grp_women_baskets',
      coordinatorProfileId: 'prof_artisan_basket',
      targetQuantity: 60,
      aggregateQuantity: 0,
      indicativeGroupPrice: { cents: 11_000, currency: 'ETB' },
      pickupPlan: 'Deliver to a shared meeting point on the last market day of the month.',
      transportPlan: 'Shared bus cargo; split by contributed bundles.',
      orderDeadline: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      status: 'open',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
      isDemo: true
    }
  ];

  const contributions: GroupContribution[] = [
    {
      id: 'con_sample_honey_1',
      opportunityId: 'col_honey_bulk',
      producerProfileId: 'prof_honey_group',
      quantity: 55,
      status: 'confirmed',
      createdAt: daysAgo(9),
      note: 'Sample contribution.',
      isDemo: true
    },
    {
      id: 'con_sample_basket_1',
      opportunityId: 'col_basket_retail',
      producerProfileId: 'prof_artisan_basket',
      quantity: 10,
      status: 'pending',
      createdAt: daysAgo(4),
      note: 'Awaiting coordinator confirmation.',
      isDemo: true
    }
  ];

  const transportPlans: TransportPlan[] = [
    {
      id: 'tp_honey',
      opportunityId: 'col_honey_bulk',
      totalCostCents: 45_000,
      totalQuantity: 200,
      currency: 'ETB',
      quoteConfirmed: false,
      notes: 'Estimated shared transport cost — a real quote has not been confirmed. Producers should treat this as an upper-bound planning figure.'
    },
    {
      id: 'tp_basket',
      opportunityId: 'col_basket_retail',
      totalCostCents: 30_000,
      totalQuantity: 60,
      currency: 'ETB',
      quoteConfirmed: false,
      notes: 'Estimated shared transport cost — not a confirmed quote.'
    }
  ];

  const inquiries: Inquiry[] = [];
  const reviews: Review[] = [];
  const reports: ListingReport[] = [];
  const verificationReviews: VerificationReview[] = [];

  return {
    categories,
    profiles,
    listings,
    groups,
    opportunities,
    contributions,
    transportPlans,
    inquiries,
    reviews,
    reports,
    verificationReviews
  };
}

function buildPlaceholder(label: string, tint: string): string {
  // Data-URL SVG placeholder. Kept deliberately abstract so we never present
  // generic imagery as documentary evidence of a specific South Omo producer.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${tint}"/><stop offset="1" stop-color="#331b0f"/></linearGradient></defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <rect x="16" y="16" width="568" height="368" fill="none" stroke="rgba(255,255,255,0.25)" stroke-dasharray="8 6" rx="10"/>
    <text x="50%" y="52%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" fill="white" opacity="0.92">${label}</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="white" opacity="0.75">SAMPLE IMAGE — not a real product photo</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type DB = {
  categories: Category[];
  profiles: Profile[];
  listings: Listing[];
  groups: ProducerGroup[];
  opportunities: CollectiveOpportunity[];
  contributions: GroupContribution[];
  transportPlans: TransportPlan[];
  inquiries: Inquiry[];
  reviews: Review[];
  reports: ListingReport[];
  verificationReviews: VerificationReview[];
};
