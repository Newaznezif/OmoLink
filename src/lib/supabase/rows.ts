/**
 * Postgres row shapes for the OmoLink schema (supabase/migrations/0001_init.sql).
 * These mirror column names exactly; the domain types in src/lib/types.ts are
 * mapped to and from these in mappers.ts.
 */

export type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  producer_type: string;
  community: string;
  operating_area: string;
  preferred_language: string;
  contact_method: unknown;
  short_bio: string;
  categories: string[];
  image_url: string | null;
  consent_to_publish: boolean;
  verification: string;
  verification_note: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description: string | null;
};

export type ListingRow = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  description: string;
  category_id: string;
  producer_id: string;
  community: string;
  unit_price_cents: number;
  currency: string;
  unit: string;
  available_quantity: number;
  min_order_quantity: number;
  availability: string;
  pickup_options: string[];
  delivery_available: boolean;
  tourism_meta: unknown;
  published: boolean;
  verification: string;
  created_at: string;
  updated_at: string;
};

export type ListingImageRow = {
  id: string;
  listing_id: string;
  caption: string | null;
  src: string;
  alt: string;
  consent_recorded: boolean;
  is_sample: boolean;
};

/** A listings row with its images embedded through a PostgREST resource join. */
export type ListingWithImagesRow = ListingRow & { listing_images: ListingImageRow[] };

export type InquiryRow = {
  id: string;
  reference: string;
  listing_id: string;
  buyer_name: string;
  buyer_contact: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  estimated_subtotal_cents: number;
  currency: string;
  preference: string;
  preferred_date: string | null;
  message: string | null;
  status: string;
  idempotency_key: string | null;
  buyer_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InquiryEventRow = {
  id: string;
  inquiry_id: string;
  at: string;
  actor: string;
  kind: string;
  detail: string;
};

export type ProducerGroupRow = {
  id: string;
  name: string;
  community: string;
  description: string | null;
  coordinator_profile_id: string;
  created_at: string;
};

export type GroupMemberRow = { group_id: string; profile_id: string };

export type OpportunityRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category_id: string;
  unit: string;
  organizing_group_id: string | null;
  coordinator_profile_id: string;
  target_quantity: number;
  indicative_group_price_cents: number | null;
  buyer_offered_price_cents: number | null;
  currency: string;
  pickup_plan: string;
  transport_plan: string | null;
  order_deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ContributionRow = {
  id: string;
  opportunity_id: string;
  producer_profile_id: string;
  quantity: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TransportPlanRow = {
  id: string;
  opportunity_id: string;
  total_cost_cents: number;
  total_quantity: number;
  currency: string;
  quote_confirmed: boolean;
  notes: string | null;
};

export type ListingReportRow = {
  id: string;
  listing_id: string;
  reason: string;
  reporter_name: string;
  reporter_contact: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

export type VerificationReviewRow = {
  id: string;
  profile_id: string;
  reviewer_profile_id: string;
  decision: string;
  reason: string;
  created_at: string;
};
