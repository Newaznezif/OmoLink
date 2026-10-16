export type CurrencyCode = 'ETB';

export type Money = {
  /** Amount stored as integer minor units (cents) to avoid float math. 1 ETB = 100 cents. */
  cents: number;
  currency: CurrencyCode;
};

export type VerificationStatus = 'unverified' | 'pending_review' | 'verified';

export type Role = 'buyer' | 'producer' | 'coordinator' | 'admin';

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
  community: string;
  operatingArea: string;
  preferredLanguage: LanguageCode;
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

export type LanguageCode = 'en' | 'am' | 'hamer' | 'dag' | 'tsamai';

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'am', 'hamer', 'dag', 'tsamai'];
