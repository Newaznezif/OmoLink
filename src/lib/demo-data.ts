import type {
  AuditLogEntry,
  Category,
  CollectiveOpportunity,
  ContactMessage,
  GroupContribution,
  Inquiry,
  Listing,
  ListingImage,
  ListingReport,
  Payment,
  ProducerGroup,
  Profile,
  Review,
  SiteSettings,
  TransportPlan,
  VerificationReview
} from './types';
import { HOMEPAGE_SECTIONS } from './types';

/**
 * Seed content for OmoNetTab.
 *
 * Two kinds of record live here and the UI tells them apart:
 *
 * - Real catalogue content (`isDemo: false`): products, prices and seller
 *   details transcribed from the producer notes and photographs supplied for the
 *   pilot. Nothing in those records has been independently verified, and fields
 *   the producers did not supply stay marked as not recorded rather than being
 *   filled in.
 * - Sample records (`isDemo: true`): illustrative accounts and listings that
 *   demonstrate workflows the real catalogue does not exercise yet. The UI
 *   labels every one of them.
 *
 * Categories are configurable and are provided as examples. They must not be
 * presented as proof that a specific product is available in a specific
 * community.
 */

/** Used wherever a producer note simply did not record the answer. */
const UNRECORDED_COMMUNITY = 'Not recorded in the producer’s notes';
const SOUTH_OMO_AREA = 'South Omo (exact location not recorded in the producer notes)';
const PICKUP_UNRECORDED = 'Collection point not recorded — arrange it with the producer when you inquire.';

/**
 * The listing model has no "quantity on request" state, and `made_to_order` is
 * the one the app already treats that way: the badge reads "Made to order" and
 * the inquiry form lifts its stock cap. Real listings use it because no producer
 * supplied a stock count.
 */
const STOCK_UNRECORDED =
  'Stock was not recorded in the producer’s notes, so this listing shows as made to order: send an inquiry to confirm what is available. Prices are as supplied by the producer. OmoNetTab has not verified this listing.';
const SERVICE_UNRECORDED =
  'Availability was not recorded in the business’s notes, so this listing shows as made to order: send an inquiry to check dates. Prices are as supplied by the business. OmoNetTab has not verified this listing.';

/**
 * Real photographs supplied by the producers. `src` points at files committed
 * under `public/images/products/<folder>/`; the original camera files stay in
 * the untracked `Pictures/` folder and are never served.
 */
function productImages(listingId: string, folder: string, label: string, files: string[]): ListingImage[] {
  return files.map((file, index) => ({
    id: `img_${folder}_${index + 1}`,
    listingId,
    src: `/images/products/${folder}/${file}`,
    alt: index === 0 ? `${label}. Photograph supplied by the producer.` : `${label}, view ${index + 1}. Photograph supplied by the producer.`,
    caption: index === 0 ? 'Photograph supplied by the producer.' : `View ${index + 1} — photograph supplied by the producer.`,
    consentRecorded: true,
    isSample: false
  }));
}

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
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
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
      verificationNote: 'This is a sample profile, intentionally unverified.',
      groupIds: ['grp_women_baskets'],
      createdAt: daysAgo(120),
      updatedAt: daysAgo(3),
      isDemo: true
    },
    {
      id: 'prof_honey_group',
      userId: 'demo_user_honey',
      role: 'coordinator',
      accountKind: 'group_or_cooperative',
      status: 'active',
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
      verificationNote: 'Awaiting review by an administrator.',
      groupIds: ['grp_honey_pool'],
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
      isDemo: true
    },
    {
      id: 'prof_guide_local',
      userId: 'demo_user_guide',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
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
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
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
      role: 'admin',
      accountKind: 'platform_admin',
      status: 'active',
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
      verificationNote: 'A sample administrator account in demo mode.',
      groupIds: [],
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
      isDemo: true
    },
    {
      id: 'prof_dairy_farmer',
      userId: 'demo_user_dairy',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
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
    },
    {
      id: 'prof_tourist_visitor',
      userId: 'demo_user_tourist',
      role: 'buyer',
      accountKind: 'tourist',
      status: 'active',
      displayName: 'Sample visitor account',
      producerType: 'other',
      community: 'Visiting — sample origin (illustrative)',
      operatingArea: 'Travelling in the South Omo area',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio:
        'Demonstrates a tourist account that sends booking inquiries and follows their own booking status. Sample data only.',
      categories: [],
      consentToPublish: false,
      verification: 'unverified',
      groupIds: [],
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
      isDemo: true
    },
    {
      id: 'prof_hotel_buyer',
      userId: 'demo_user_hotel',
      role: 'buyer',
      accountKind: 'business_buyer',
      organizationName: 'Sample town hotel (illustrative)',
      status: 'active',
      displayName: 'Sample hotel purchasing account',
      producerType: 'other',
      community: 'Buying for a hotel — sample location (illustrative)',
      operatingArea: 'Regular weekly purchases',
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio:
        'Demonstrates a business buyer (hotel, restaurant, retailer or institution) placing bulk inquiries. Sample data only.',
      categories: [],
      consentToPublish: false,
      verification: 'unverified',
      groupIds: [],
      createdAt: daysAgo(15),
      updatedAt: daysAgo(4),
      isDemo: true
    },
    /*
     * Sellers recorded from the producer notes supplied with the real product
     * photographs. Their `userId` deliberately does NOT start with `demo_user_`,
     * so the demo sign-in endpoint refuses them and they are filtered out of the
     * sample account picker — a real person cannot be signed into here.
     */
    {
      id: 'prof_getachew_kafa',
      userId: 'pilot_user_getachew_kafa',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Mr. Getachew Kafa',
      producerType: 'artisan',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0977105752', consent: true },
      shortBio:
        'Traditional clothing (fota) and barabaso. Name, phone number and product details are exactly as supplied by the producer for the OmoNetTab pilot.',
      categories: ['cat_textile'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote:
        'Taken from the producer’s own notes and not independently verified. The phone number below is also supplied under another name.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_gado_gofa',
      userId: 'pilot_user_gado_gofa',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Mrs. Gado Gofa',
      producerType: 'artisan',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0919219830', consent: true },
      shortBio:
        'Jewelry and traditional clothing (kashi). Name, phone number and product details are exactly as supplied by the producer for the OmoNetTab pilot.',
      categories: ['cat_handicraft', 'cat_textile'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: 'Taken from the producer’s own notes. No independent verification has been carried out yet.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_tate',
      userId: 'pilot_user_tate',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Mrs. Tate',
      producerType: 'household',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0908536575', consent: true },
      shortBio:
        'Borde, a traditional drink. Name, phone number and product details are exactly as supplied by the producer for the OmoNetTab pilot.',
      categories: ['cat_honey'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: 'Taken from the producer’s own notes. No independent verification has been carried out yet.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_alpha_omega_guest_house',
      userId: 'pilot_user_alpha_omega',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Alpha and Omega Guest House',
      producerType: 'tourism_operator',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0915613138', consent: true },
      shortBio:
        'Guest house offering overnight rooms. Price, breakfast, parking and location are exactly as supplied by the business for the OmoNetTab pilot.',
      categories: ['cat_tourism'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: 'Taken from the business’s own notes. No independent verification has been carried out yet.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_kizo_lodge',
      userId: 'pilot_user_kizo_lodge',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Kizo Lodge',
      producerType: 'tourism_operator',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0929878880', consent: true },
      shortBio:
        'Lodge offering overnight rooms with breakfast. Price, parking and location are exactly as supplied by the business for the OmoNetTab pilot.',
      categories: ['cat_tourism'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: 'Taken from the business’s own notes. No independent verification has been carried out yet.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_selhadin_pension',
      userId: 'pilot_user_selhadin_pension',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Selhadin Pension',
      producerType: 'tourism_operator',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0946554575', consent: true },
      shortBio:
        'Pension offering overnight rooms. Price, breakfast, parking and location are exactly as supplied by the business for the OmoNetTab pilot.',
      categories: ['cat_tourism'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote:
        'Taken from the business’s own notes. The sign in the supplied photograph spells the name “Selehadin”; the note supplied to us spells it “selhadin”, which is what is published here.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_chufo_adey',
      userId: 'pilot_user_chufo_adey',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'Mr. Chufo Adey',
      producerType: 'guide',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'phone', value: '0977105752', consent: true },
      shortBio:
        'Tour guide, translation and electronics. Name, phone number and services are exactly as supplied by the producer for the OmoNetTab pilot.',
      categories: ['cat_guided', 'cat_other'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote:
        'No price, duration or availability was supplied for these services, so no listing has been published — send an inquiry or call the number on this profile. The same phone number is also supplied under another name.',
      groupIds: [],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
      isDemo: false
    },
    {
      id: 'prof_pilot_holding',
      userId: 'demo_user_pilot_holding',
      role: 'producer',
      accountKind: 'producer',
      status: 'active',
      displayName: 'OmoNetTab pilot holding account — producer not yet recorded',
      producerType: 'other',
      community: UNRECORDED_COMMUNITY,
      operatingArea: SOUTH_OMO_AREA,
      preferredLanguage: 'en',
      contactMethod: { kind: 'in_app' },
      shortBio:
        'Several products reached us with photographs and prices but no named seller. They are held here so buyers can see and inquire about them honestly. Each one moves to its own producer’s account as soon as that person is recorded — this account is not a seller and should not be presented as one.',
      categories: ['cat_handicraft', 'cat_honey'],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote:
        'Holds listings whose producer was not named in the material supplied to us. The details are as supplied and have not been independently verified.',
      groupIds: [],
      createdAt: daysAgo(14),
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

  type RealListingInput = {
    id: string;
    slug: string;
    title: string;
    /** The producer's own wording, transcribed from their note. */
    description: string;
    categoryId: string;
    producerId: string;
    community: string;
    /** Whole birr, exactly as the producer quoted it. */
    birr: number;
    folder: string;
    label: string;
    files: string[];
    kind?: Listing['kind'];
    unitOfSale?: Listing['unitOfSale'];
    pickup?: string[];
    featured?: boolean;
  };

  const realListing = (input: RealListingInput): Listing => {
    const kind = input.kind ?? 'product';
    return {
      id: input.id,
      slug: input.slug,
      kind,
      title: input.title,
      description: `${input.description}\n\n${kind === 'service' ? SERVICE_UNRECORDED : STOCK_UNRECORDED}`,
      categoryId: input.categoryId,
      producerId: input.producerId,
      community: input.community,
      unitPrice: { cents: input.birr * 100, currency: 'ETB' },
      unitOfSale: input.unitOfSale ?? 'item',
      availableQuantity: 0,
      minOrderQuantity: 1,
      availability: 'made_to_order',
      pickupOptions: input.pickup ?? [PICKUP_UNRECORDED],
      deliveryAvailable: false,
      lastUpdated: daysAgo(2),
      createdAt: daysAgo(14),
      verification: 'unverified',
      published: true,
      featured: input.featured,
      images: productImages(input.id, input.folder, input.label, input.files),
      isDemo: false
    };
  };

  const HAMER = 'Hamer';

  const realListings: Listing[] = [
    realListing({
      id: 'lst_fota_menswear',
      slug: 'fota-menswear',
      title: 'Fota (menswear)',
      description:
        'The fota is usually worn by the hamer men as seen in the picture but they also use it as a blanket.\nSourced from kenya.',
      categoryId: 'cat_textile',
      producerId: 'prof_getachew_kafa',
      community: HAMER,
      birr: 1200,
      folder: 'fota-men',
      label: 'Fota wrapped over one shoulder, as worn by Hamer men',
      files: ['fota-men-01-img-4516.jpg', 'fota-men-02-img-4513.jpg'],
      featured: true
    }),
    realListing({
      id: 'lst_fota_womenswear',
      slug: 'fota-womenswear',
      title: 'Fota (womenswear)',
      description: 'Fota is worn by hamer women as a skirt by wrapping it around the waist.\nSourced from kenya.',
      categoryId: 'cat_textile',
      producerId: 'prof_getachew_kafa',
      community: HAMER,
      birr: 1200,
      folder: 'fota-women',
      label: 'Fota wrapped as a skirt, as worn by Hamer women',
      files: ['fota-women-01-img-4397-2.jpg', 'fota-women-02-img-4399-2.jpg', 'fota-women-03-img-4402-2.jpg']
    }),
    realListing({
      id: 'lst_barabaso',
      slug: 'barabaso',
      title: 'Barabaso',
      description:
        'Barabaso is a shoe used by the hamer people, it is known to have a firm grip making it practical to walk on slippery roads.\nMade of: Tire',
      categoryId: 'cat_textile',
      producerId: 'prof_getachew_kafa',
      community: HAMER,
      birr: 300,
      folder: 'barabaso',
      label: 'Barabaso shoe made from tyre',
      files: ['barabaso-01-img-4407-3.jpg']
    }),
    realListing({
      id: 'lst_kashi',
      slug: 'kashi',
      title: 'Kashi',
      description:
        'kashi is worn by hamer women. It is usually worn on special occasions but some hamer women use it as their everyday clothing.\nMade from: goat and bunny skin.',
      categoryId: 'cat_textile',
      producerId: 'prof_gado_gofa',
      community: HAMER,
      birr: 3000,
      folder: 'kashi',
      label: 'Kashi garment of goat and bunny skin with beadwork',
      files: ['kashi-01-img-4339.jpg', 'kashi-02-img-4348-2.jpg', 'kashi-03-img-4363.jpg'],
      featured: true
    }),
    realListing({
      id: 'lst_borde',
      slug: 'borde',
      title: 'Borde',
      description:
        'Borde is a traditional drink which is drank with food and has an alcohol content\nContent: Corn and Sorghum',
      categoryId: 'cat_honey',
      producerId: 'prof_tate',
      community: UNRECORDED_COMMUNITY,
      birr: 100,
      folder: 'borde',
      label: 'Borde, a traditional drink of corn and sorghum',
      files: ['borde-01-img-4418-3.jpg']
    }),
    realListing({
      id: 'lst_kuri',
      slug: 'kuri',
      title: 'Kuri',
      description: 'kuri is a traditional drink which is known to have a medicinal factor.\nContent: honey',
      categoryId: 'cat_honey',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2000,
      folder: 'kuri',
      label: 'Kuri, a traditional honey drink',
      files: ['kuri-01-img-4372-2.jpg']
    }),
    realListing({
      id: 'lst_chele_bracelet',
      slug: 'chele-bracelet',
      title: 'Chele (beaded bracelet)',
      description:
        'Chele is a handmade bracelet made by the hamer people for tourists.\nMade of: beads, pumpkin seed and tongora (elastic).',
      categoryId: 'cat_handicraft',
      producerId: 'prof_gado_gofa',
      community: HAMER,
      birr: 200,
      folder: 'chele-bracelet',
      label: 'Chele beaded bracelet',
      files: [
        'chele-bracelet-01-img-4193-2.jpg',
        'chele-bracelet-02-img-4203-2.jpg',
        'chele-bracelet-03-img-4210.jpg',
        'chele-bracelet-04-img-4212.jpg',
        'chele-bracelet-05-img-4213.jpg',
        'chele-bracelet-06-img-4218.jpg',
        'chele-bracelet-07-img-4231-2.jpg',
        'chele-bracelet-08-img-4233-3.jpg',
        'chele-bracelet-09-img-4235.jpg',
        'chele-bracelet-10-img-4241-2.jpg',
        'chele-bracelet-11-img-4245.jpg',
        'chele-bracelet-12-img-4246.jpg',
        'chele-bracelet-13-img-4248.jpg',
        'chele-bracelet-14-img-4250-4.jpg',
        'chele-bracelet-15-img-4253-2.jpg'
      ],
      featured: true
    }),
    realListing({
      id: 'lst_shikini_necklace',
      slug: 'shikini-necklace',
      title: 'Shikini (beaded necklace)',
      description: 'shikini is a handmade necklace made by the hamer people for tourists.\nMade of: beads and thread.',
      categoryId: 'cat_handicraft',
      producerId: 'prof_gado_gofa',
      community: HAMER,
      birr: 200,
      folder: 'shikini-necklace',
      label: 'Shikini beaded necklace',
      files: [
        'shikini-necklace-01-img-4266.jpg',
        'shikini-necklace-02-img-4276.jpg',
        'shikini-necklace-03-img-4282-2.jpg'
        // Two further photographs of this necklace show the model's mouth, chin,
        // beard and ear. No consent record covers a recognisable person, so they
        // stay in the untracked .pending-review/ folder rather than in public/.
      ]
    }),
    realListing({
      id: 'lst_artifact_hamer_boy',
      slug: 'artifact-hamer-boy',
      title: 'Hamer boy (handmade artifact)',
      description:
        'hamer boy is a handmade artifact and describes a boy standing people watching.\nMade from: ebony wood',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2500,
      folder: 'artifact-hamer-boy',
      label: 'Carved ebony wood artifact of a Hamer boy standing',
      files: [
        'artifact-hamer-boy-01-img-4172-2.jpg',
        'artifact-hamer-boy-02-img-4175.jpg',
        'artifact-hamer-boy-03-img-4177.jpg'
      ]
    }),
    realListing({
      id: 'lst_artifact_mursi_woman',
      slug: 'artifact-mursi-woman',
      title: 'Mursi woman (handmade artifact)',
      description: 'mursi is a woman who has on her lower lip plate.\nMade from: ebony wood',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2500,
      folder: 'artifact-mursi-woman',
      label: 'Carved ebony wood artifact of a Mursi woman with a lower lip plate',
      files: [
        'artifact-mursi-woman-01-img-4152-3.jpg',
        'artifact-mursi-woman-02-img-4153-2.jpg',
        'artifact-mursi-woman-03-img-4154-2.jpg'
      ]
    }),
    realListing({
      id: 'lst_artifact_nyangatom_elder',
      slug: 'artifact-nyangatom-elder',
      title: 'Nyangatom elder (handmade artifact)',
      description: 'nyangatom elder man dressed up for a special occasion.\nMade from: ebony wood',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2500,
      folder: 'artifact-nyangatom-elder',
      label: 'Carved ebony wood artifact of a Nyangatom elder dressed for a special occasion',
      files: [
        'artifact-nyangatom-elder-01-img-4168.jpg',
        'artifact-nyangatom-elder-02-img-4170.jpg',
        'artifact-nyangatom-elder-03-img-4171-2.jpg'
      ]
    }),
    realListing({
      id: 'lst_artifact_tsemay_woman',
      slug: 'artifact-tsemay-woman',
      title: 'Tsemay woman (handmade artifact)',
      description: 'Tsemay women dressed in her traditional attire.\nMade from: ebony wood and goat skin.',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2500,
      folder: 'artifact-tsemay-woman',
      label: 'Carved artifact of a Tsemay woman in traditional attire',
      files: [
        'artifact-tsemay-woman-01-img-4156-2.jpg',
        'artifact-tsemay-woman-02-img-4157.jpg',
        'artifact-tsemay-woman-03-img-4159.jpg'
      ]
    }),
    realListing({
      id: 'lst_artifact_tsemay_first_wife',
      slug: 'artifact-tsemay-first-wife',
      title: 'Tsemay first wife (handmade artifact)',
      description:
        'Tsemay woman dressed in her traditional attire but the necklace shows that this tsemay woman is the first wife.\nMade from: ebony wood and goat skin.',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2500,
      folder: 'artifact-tsemay-first-wife',
      label: 'Carved artifact of a Tsemay woman whose necklace marks her as the first wife',
      files: [
        'artifact-tsemay-first-wife-01-img-4162-2.jpg',
        'artifact-tsemay-first-wife-02-img-4165.jpg',
        'artifact-tsemay-first-wife-03-img-4166.jpg'
      ]
    }),
    realListing({
      id: 'lst_big_shorka',
      slug: 'cutlery-big-shorka',
      title: 'Big shorka',
      description: 'shorka is used to drink coffee, milk, water.\nMade from: pumpkin',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 1000,
      folder: 'cutlery-big-shorka',
      label: 'Big shorka drinking vessel made from pumpkin',
      files: ['cutlery-big-shorka-01-img-4312.jpg', 'cutlery-big-shorka-02-img-4313.jpg']
    }),
    realListing({
      id: 'lst_small_shorka',
      slug: 'cutlery-small-shorka',
      title: 'Small shorka',
      description: 'shorka is used to drink coffee, milk, water.\nMade from: pumpkin',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 1000,
      folder: 'cutlery-small-shorka',
      label: 'Small shorka drinking vessel made from pumpkin',
      files: [
        'cutlery-small-shorka-01-img-4316.jpg',
        'cutlery-small-shorka-02-img-4319.jpg',
        'cutlery-small-shorka-03-img-4320.jpg'
      ]
    }),
    realListing({
      id: 'lst_gebete',
      slug: 'cutlery-gebete',
      title: 'Gebete',
      description: 'gebete is a platter used to serve food.\nMade from: ebony wood',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 2500,
      folder: 'cutlery-gebete',
      label: 'Gebete food platter carved from ebony wood',
      files: ['cutlery-gebete-01-img-4329.jpg', 'cutlery-gebete-02-img-4330.jpg', 'cutlery-gebete-03-img-4332-2.jpg']
    }),
    realListing({
      id: 'lst_gungulo',
      slug: 'cutlery-gungulo',
      title: 'Gungulo',
      description: 'gungulo is used to spoon coffee.\nMade from: dried out pumpkin',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 300,
      folder: 'cutlery-gungulo',
      label: 'Gungulo coffee spoon made from dried out pumpkin',
      files: [
        'cutlery-gungulo-01-img-4304-2.jpg',
        'cutlery-gungulo-02-img-4305-3.jpg',
        'cutlery-gungulo-03-img-4306-2.jpg'
      ]
    }),
    realListing({
      id: 'lst_kali',
      slug: 'cutlery-kali',
      title: 'Kali',
      description: 'kali is a spoon used to eat different kinds of food\nMade from: ebony wood',
      categoryId: 'cat_handicraft',
      producerId: 'prof_pilot_holding',
      community: UNRECORDED_COMMUNITY,
      birr: 500,
      folder: 'cutlery-kali',
      label: 'Kali eating spoon carved from ebony wood',
      files: ['cutlery-kali-01-img-4326.jpg', 'cutlery-kali-02-img-4327-2.jpg', 'cutlery-kali-03-img-4328.jpg']
    }),
    realListing({
      id: 'lst_alpha_omega_guest_house',
      slug: 'alpha-omega-guest-house',
      title: 'Alpha and Omega Guest House',
      description:
        'Overnight rooms at Alpha and Omega Guest House.\nBreakfast: not included\nParking: Can host 6 cars\nLocation: https://maps.app.goo.gl/ETeQzScMVoQTzGyw8',
      categoryId: 'cat_tourism',
      producerId: 'prof_alpha_omega_guest_house',
      community: UNRECORDED_COMMUNITY,
      birr: 600,
      folder: 'alpha-omega-guest-house',
      label: 'Alpha and Omega Guest House',
      files: [
        'alpha-omega-guest-house-01-img-4468-2.jpg',
        'alpha-omega-guest-house-02-img-4471.jpg',
        'alpha-omega-guest-house-03-img-4472.jpg'
      ],
      kind: 'service',
      unitOfSale: 'day',
      pickup: ['Guests stay at the property. The location link is in the description above.'],
      featured: true
    }),
    realListing({
      id: 'lst_kizo_lodge',
      slug: 'kizo-lodge',
      title: 'Kizo Lodge',
      description:
        'Overnight rooms at Kizo Lodge.\nBreakfast: inclusive\nParking: Can host 20 cars\nLocation: https://maps.app.goo.gl/SDjHftCHXavtcZDQ6',
      categoryId: 'cat_tourism',
      producerId: 'prof_kizo_lodge',
      community: UNRECORDED_COMMUNITY,
      birr: 3500,
      folder: 'kizo-lodge',
      label: 'Kizo Lodge',
      files: ['kizo-lodge-01-img-4482-4.jpg', 'kizo-lodge-02-img-4494.jpg', 'kizo-lodge-03-img-4501.jpg'],
      kind: 'service',
      unitOfSale: 'day',
      pickup: ['Guests stay at the property. The location link is in the description above.'],
      featured: true
    }),
    realListing({
      id: 'lst_selhadin_pension',
      slug: 'selhadin-pension',
      title: 'Selhadin Pension',
      description:
        'Overnight rooms at Selhadin Pension.\nBreakfast: not included\nParking: Can host 5 cars\nLocation: https://maps.app.goo.gl/G6tFSRq285msBD54A',
      categoryId: 'cat_tourism',
      producerId: 'prof_selhadin_pension',
      community: UNRECORDED_COMMUNITY,
      birr: 700,
      folder: 'selhadin-pension',
      label: 'Selhadin Pension',
      files: [
        'selhadin-pension-01-img-4431-3.jpg',
        'selhadin-pension-02-img-4436.jpg',
        'selhadin-pension-03-img-4439.jpg'
      ],
      kind: 'service',
      unitOfSale: 'day',
      pickup: ['Guests stay at the property. The location link is in the description above.']
    })
  ];

  /**
   * Three sample listings stay, and each has a job the real catalogue cannot do:
   * `lst_basket_set` and `lst_forest_honey` are the fixtures the authorisation
   * suite and the four HTTP smoke suites hang off — two different producers who
   * must not be able to touch each other’s records — and they show a counted
   * stock level with bulk delivery, which no real listing has yet.
   * `lst_milk_butter` is the only occupant of the dairy category, which no
   * supplied product belongs to. All three are labelled as samples in the UI.
   */
  const listings: Listing[] = [
    ...realListings,
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

  categories.forEach((category, index) => {
    category.sortOrder = (index + 1) * 10;
    category.active = true;
  });

  const inquiries: Inquiry[] = [];
  /**
   * Payment attempts start empty on purpose. Seeding a "paid" record would be a
   * claim that money moved, and in demo mode nothing does.
   */
  const payments: Payment[] = [];
  const reviews: Review[] = [];
  const reports: ListingReport[] = [];
  const verificationReviews: VerificationReview[] = [];
  const contactMessages: ContactMessage[] = [];

  /**
   * Homepage copy that an administrator can edit at runtime. These strings are
   * descriptive of the platform, not claims about real transactions, partners,
   * or impact, and the featured ids point at the records above.
   */
  const siteSettings: SiteSettings = {
    siteName: 'OmoNetTab',
    tagline: 'Connecting Cultures and Commerce',
    heroTitle: 'Sell directly. Price transparently. Deliver together.',
    heroDescription:
      'OmoNetTab helps rural entrepreneurs, local producers, artisans, and community tourism providers in South Omo present their offerings and receive inquiries from potential customers. Most listings here carry a producer’s own photographs, price and contact details, supplied for this pilot. OmoNetTab has not verified any of them yet, and a few records are labelled as samples because they exist only to demonstrate the platform.',
    announcementBar: {
      enabled: true,
      text: 'Pilot build — listings show what producers supplied us, unverified. No payment is taken and no sale is recorded.'
    },
    featuredProductIds: ['lst_kashi', 'lst_chele_bracelet', 'lst_fota_menswear'],
    featuredServiceIds: ['lst_alpha_omega_guest_house', 'lst_kizo_lodge'],
    featuredProducerIds: ['prof_gado_gofa', 'prof_getachew_kafa', 'prof_tate'],
    homepageSections: HOMEPAGE_SECTIONS.map((id) => ({ id, visible: true })),
    contactEmail: 'hello@omonetab.example',
    contactPhone: '',
    addressNote: 'Sample coordination point: Jinka weekly market, South Omo (illustrative).',
    socialLinks: [],
    footerNote: 'Built for a community-led pilot. Producer data is never sold.',
    accentColor: '#b2542a',
    updatedAt: now,
    isDemo: true
  };

  const auditLog: AuditLogEntry[] = [];

  return {
    categories,
    profiles,
    listings,
    groups,
    opportunities,
    contributions,
    transportPlans,
    inquiries,
    payments,
    reviews,
    reports,
    verificationReviews,
    contactMessages,
    siteSettings,
    auditLog
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
  payments: Payment[];
  reviews: Review[];
  reports: ListingReport[];
  verificationReviews: VerificationReview[];
  contactMessages: ContactMessage[];
  siteSettings: SiteSettings;
  auditLog: AuditLogEntry[];
};
