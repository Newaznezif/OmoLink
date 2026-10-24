export type CurrencyCode = 'ETB';

export type Money = {
  /** Amount stored as integer minor units (cents) to avoid float math. 1 ETB = 100 cents. */
  cents: number;
  currency: CurrencyCode;
};

export type VerificationStatus = 'unverified' | 'pending_review' | 'verified';

/**
 * Permission class, decided by an administrator and never by the account holder.
 * 'buyer' covers both tourists and individual/business customers: they share the
 * same permissions and differ only in accountKind (their profile type).
 */
export type Role = 'buyer' | 'producer' | 'coordinator' | 'admin';

export type AccountStatus = 'active' | 'suspended';

export type UnitOfSale =
  | 'item'
  | 'kg'
  | 'bundle'
  | 'liter'
  | 'person'
  | 'group'
  | 'package'
  | 'day'
  | 'service';

export const UNIT_OF_SALES: UnitOfSale[] = [
  'item',
  'kg',
  'bundle',
  'liter',
  'person',
  'group',
  'package',
  'day',
  'service'
];

export type AvailabilityStatus = 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable';

export type ListingKind = 'product' | 'service';

export type ProducerType =
  | 'artisan'
  | 'farmer'
  | 'producer_group'
  | 'cooperative'
  | 'guide'
  | 'tourism_operator'
  | 'household'
  | 'other';

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  producerType: ProducerType;
  /**
   * Authoritative permission class. Read from this record on the server, never
   * from a cookie or client payload. Only an administrator may change it.
   */
  role: Role;
  /** Distinguishes a tourist from an individual or business customer. */
  accountKind: AccountKind;
  /** Set for business buyers (hotel, retailer, restaurant, institution). */
  organizationName?: string;
  /** A suspended account keeps its data but may not act. */
  status: AccountStatus;
  community: string;
  operatingArea: string;
  preferredLanguage: LanguageCode;
  /**
   * The colour scheme saved for this account. Missing means the account has
   * never chosen one, which is not the same as light: the browser copy still
   * decides what to show until a choice is saved here.
   */
  theme?: ThemePreference;
  contactMethod: ContactMethod;
  shortBio: string;
  categories: string[];
  imageUrl?: string;
  consentToPublish: boolean;
  verification: VerificationStatus;
  verificationNote?: string;
  groupIds: string[];
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
};

export type ContactMethod =
  | { kind: 'none' }
  | { kind: 'in_app' }
  | { kind: 'phone'; value: string; consent: boolean }
  | { kind: 'email'; value: string; consent: boolean };

export type Category = {
  id: string;
  name: string;
  slug: string;
  kind: ListingKind | 'both';
  description: string;
  /** Short label rendered in place of an icon; no image assets are invented. */
  icon?: string;
  /** Lower numbers sort first. Missing values sort after configured ones. */
  sortOrder?: number;
  /** Deactivated categories stay hidden from filters but keep their listings. */
  active?: boolean;
};

export type ListingImage = {
  id: string;
  listingId: string;
  caption: string;
  /** Data URL or remote URL. In demo we use locally generated SVG tiles. */
  src: string;
  alt: string;
  /** Consent flag — required for images showing people, ceremonies, or cultural property. */
  consentRecorded: boolean;
  isSample: boolean;
};

export type Listing = {
  id: string;
  slug: string;
  kind: ListingKind;
  title: string;
  description: string;
  categoryId: string;
  producerId: string;
  community: string;
  /** Explicit unit price. Never includes hidden fees. */
  unitPrice: Money;
  unitOfSale: UnitOfSale;
  availableQuantity: number;
  minOrderQuantity: number;
  availability: AvailabilityStatus;
  /** Free-text pickup / delivery notes. */
  pickupOptions: string[];
  deliveryAvailable: boolean;
  lastUpdated: string;
  createdAt: string;
  verification: VerificationStatus;
  published: boolean;
  /** Homepage promotion, decided by an administrator. */
  featured?: boolean;
  /** Archived listings disappear from the marketplace but keep their history. */
  archived?: boolean;
  /** Present for kind === 'service'. */
  tourism?: TourismMeta;
  images: ListingImage[];
  isDemo: boolean;
};

export type TourismMeta = {
  packageName: string;
  durationHours: number;
  groupCapacity: number;
  inclusions: string[];
  exclusions: string[];
  bookingConditions: string;
  meetingPoint: string;
  cancellationPolicy: string;
};

export type InquiryStatus =
  | 'new'
  | 'accepted'
  | 'awaiting_confirmation'
  | 'fulfillment_arranged'
  | 'completed'
  | 'cancelled';

export type Inquiry = {
  id: string;
  reference: string;
  listingId: string;
  buyerName: string;
  buyerContact: string;
  /** Set when the buyer was signed in, so they can find the record again later. */
  buyerProfileId?: string;
  quantity: number;
  unitOfSale: UnitOfSale;
  /** Cents — server-computed from quantity * unitPrice. */
  estimatedSubtotalCents: number;
  currency: CurrencyCode;
  preference: 'pickup' | 'delivery' | 'booking' | 'unsure';
  preferredDate?: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  events: InquiryEvent[];
  isDemo: boolean;
  /** Idempotency key to prevent duplicate submissions on retry. */
  idempotencyKey?: string;
};

export type InquiryEvent = {
  id: string;
  inquiryId: string;
  at: string;
  actor: 'buyer' | 'seller' | 'system';
  kind: 'created' | 'status_changed' | 'message';
  detail: string;
};

/**
 * Which money-mover a payment went through. `demo_simulated` never exists outside
 * demo mode and every record carrying it is labelled as a simulation on screen.
 */
export type PaymentProviderId = 'demo_simulated' | 'chapa';

/**
 * Our own payment states. A provider status is translated into one of these by
 * `src/lib/payments.ts`; nothing here claims a terminal meaning that the provider
 * documentation does not give it.
 */
export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

/**
 * One payment attempt against one inquiry. The amount is copied from the
 * inquiry's server-computed subtotal at creation and never accepted from a
 * browser afterwards, so a receipt can be trusted to match what was charged.
 */
export type Payment = {
  id: string;
  /** Our reference, sent to the provider as merchant_reference and printed on receipts. */
  reference: string;
  inquiryId: string;
  listingId: string;
  buyerProfileId: string;
  sellerProfileId: string;
  provider: PaymentProviderId;
  /** The provider's own reference, stored only once the provider returns it. */
  providerReference?: string;
  /** Cents, copied from the inquiry. */
  amountCents: number;
  currency: CurrencyCode;
  /** Provider-reported fee in cents, if the provider reports one. Never client input. */
  feeCents?: number;
  /** Payment method reported by the provider, e.g. 'telebirr'. */
  paymentMethod?: string;
  status: PaymentStatus;
  /** Hosted checkout page for the buyer to complete payment on. */
  checkoutUrl?: string;
  /** When the provider says its checkout stops accepting payment, if it says. */
  checkoutExpiresAt?: string;
  /** Set only by the demo provider, and only to pick which simulation runs. */
  demoOutcome?: 'success' | 'pending' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  closedAt?: string;
  failureReason?: string;
  /** True when this is a simulated payment. Shown to buyers and administrators. */
  isDemo: boolean;
  events: PaymentEvent[];
};

/**
 * Append-only history of a payment. `providerEventId` records the provider's own
 * event identity so a repeated webhook can be recognised and ignored.
 */
export type PaymentEvent = {
  id: string;
  paymentId: string;
  at: string;
  actor: 'buyer' | 'seller' | 'provider' | 'system';
  kind: 'created' | 'checkout_ready' | 'verified' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'webhook';
  detail: string;
  providerEventId?: string;
};

export type ProducerGroup = {
  id: string;
  name: string;
  community: string;
  description: string;
  coordinatorProfileId: string;
  memberProfileIds: string[];
  createdAt: string;
  isDemo: boolean;
};

export type CollectiveOpportunity = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  unitOfSale: UnitOfSale;
  organizingGroupId: string;
  coordinatorProfileId: string;
  targetQuantity: number;
  /** Snapshot of contributions at read time. Recomputed from groupContributions. */
  aggregateQuantity: number;
  indicativeGroupPrice?: Money;
  buyerOfferedPrice?: Money;
  pickupPlan: string;
  transportPlan?: string;
  orderDeadline?: string;
  status: 'open' | 'closing_soon' | 'closed' | 'fulfilled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
};

export type GroupContribution = {
  id: string;
  opportunityId: string;
  producerProfileId: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'withdrawn';
  createdAt: string;
  updatedAt?: string;
  note?: string;
  isDemo: boolean;
};

export type TransportPlan = {
  id: string;
  opportunityId: string;
  totalCostCents: number;
  totalQuantity: number;
  currency: CurrencyCode;
  quoteConfirmed: boolean;
  notes: string;
};

export type Review = {
  id: string;
  listingId: string;
  producerProfileId: string;
  inquiryId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  authorName: string;
  authorProfileId?: string;
  status: 'published' | 'hidden';
  moderationNote?: string;
  createdAt: string;
  isDemo: boolean;
};

export type ListingReport = {
  id: string;
  listingId: string;
  reason: string;
  reporterName: string;
  reporterContact: string;
  status: 'open' | 'reviewing' | 'resolved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  isDemo: boolean;
};

export type VerificationReview = {
  id: string;
  profileId: string;
  reviewerProfileId: string;
  decision: 'approved' | 'rejected' | 'needs_more_info';
  reason: string;
  createdAt: string;
  isDemo: boolean;
};

/**
 * Interface languages the app offers.
 *
 * 'en', 'am', 'zh-Hans' and 'it' are ordinary BCP 47 tags. 'hamer', 'dag' and
 * 'tsamai' are internal identifiers only: these three languages have no code we
 * can verify, so we deliberately do not invent one (see `documentLangFor`).
 * Completeness of each dictionary is a separate question, recorded in
 * `src/lib/i18n/index.ts`; offering an option is not a claim of full coverage.
 */
export type LanguageCode = 'en' | 'am' | 'zh-Hans' | 'it' | 'hamer' | 'dag' | 'tsamai';

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'am', 'zh-Hans', 'it', 'hamer', 'dag', 'tsamai'];

/**
 * The colour scheme a visitor chose. There is no "system" value on purpose: the
 * choice is rendered on the server from a stored value, so a page has to resolve
 * to one palette or the other, and an unresolved third option would be a claim
 * the server cannot verify.
 */
export type ThemePreference = 'light' | 'dark';

export const SUPPORTED_THEMES: ThemePreference[] = ['light', 'dark'];

/**
 * Which kind of account a person registered as. Tourists and customers share the
 * 'buyer' role (identical permissions) but keep a distinct profile type, so the
 * dashboard can speak to them appropriately.
 */
export type AccountKind =
  | 'tourist'
  | 'individual_buyer'
  | 'business_buyer'
  | 'producer'
  | 'group_or_cooperative'
  | 'platform_admin';

export const ACCOUNT_KINDS: AccountKind[] = [
  'tourist',
  'individual_buyer',
  'business_buyer',
  'producer',
  'group_or_cooperative',
  'platform_admin'
];

/** Kinds a visitor may choose when registering. Admin is never one of them. */
export const SELF_SERVICE_ACCOUNT_KINDS: AccountKind[] = [
  'tourist',
  'individual_buyer',
  'business_buyer',
  'producer',
  'group_or_cooperative'
];

/**
 * The permission class a registration can produce. Selling accounts become
 * 'producer'; a group that registers still starts as a plain producer — the
 * extra 'coordinator' powers (opening a collective opportunity, confirming
 * other people's contributions) are assigned by an administrator, and 'admin'
 * is provisioned by SQL or an existing administrator.
 */
export function roleForNewAccount(kind: AccountKind): Role {
  return kind === 'producer' || kind === 'group_or_cooperative' ? 'producer' : 'buyer';
}

/** Anything unknown or privileged falls back to the least interesting buyer. */
export function selfServiceAccountKind(value: unknown): AccountKind {
  return SELF_SERVICE_ACCOUNT_KINDS.includes(value as AccountKind)
    ? (value as AccountKind)
    : 'individual_buyer';
}

export type HomepageSectionId =
  | 'hero'
  | 'search'
  | 'featured_products'
  | 'featured_tourism'
  | 'categories'
  | 'producer_highlights'
  | 'collective'
  | 'team'
  | 'how_it_works'
  | 'trust';

export const HOMEPAGE_SECTIONS: HomepageSectionId[] = [
  'hero',
  'search',
  'featured_products',
  'featured_tourism',
  'categories',
  'producer_highlights',
  'collective',
  'team',
  'how_it_works',
  'trust'
];

/**
 * Admin-editable content and appearance. Persisted, so ordinary text changes do
 * not require a code change. Fields that genuinely need build-time values
 * (favicon file, Tailwind palette at compile time) are not pretend-configurable
 * here — see README "What the admin can and cannot change".
 */
export type SiteSettings = {
  siteName: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  announcementBar: { enabled: boolean; text: string };
  featuredProductIds: string[];
  featuredServiceIds: string[];
  featuredProducerIds: string[];
  /** Sections to show on the homepage, in order. */
  homepageSections: { id: HomepageSectionId; visible: boolean }[];
  contactEmail: string;
  contactPhone: string;
  addressNote: string;
  socialLinks: { label: string; url: string }[];
  footerNote: string;
  /** Hex colour applied to the accent CSS variable at render time. */
  accentColor: string;
  updatedAt: string;
  updatedByProfileId?: string;
  isDemo: boolean;
};

export type AuditAction =
  | 'role_changed'
  | 'account_suspended'
  | 'account_reactivated'
  | 'verification_decision'
  | 'listing_moderated'
  | 'listing_featured'
  | 'category_changed'
  | 'site_settings_changed'
  | 'report_resolved'
  | 'review_moderated'
  | 'payment_recorded'
  | 'record_archived';

/**
 * Who did what. A safe summary only: never a password, token, or key.
 */
export type AuditLogEntry = {
  id: string;
  at: string;
  actorProfileId: string;
  actorName: string;
  action: AuditAction;
  recordType: 'profile' | 'listing' | 'category' | 'settings' | 'report' | 'review' | 'opportunity' | 'payment';
  recordId: string;
  summary: string;
  isDemo: boolean;
};

/**
 * Messages sent from /contact. Stored so an administrator can see them. Nothing
 * here sends an email or SMS — claiming delivery would be false.
 */
export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'handled';
  isDemo: boolean;
};
