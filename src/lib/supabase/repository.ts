import type { SupabaseClient } from '@supabase/supabase-js';
import { multiplyUnitPrice } from '../money';
import { makeReference } from '../ids';
import type {
  CollectiveOpportunity,
  Inquiry,
  Listing,
  Profile,
  ProducerGroup,
  TransportPlan,
  UnitOfSale
} from '../types';
import type { Repo } from '../repo';
import {
  mapCategory,
  mapContribution,
  mapGroup,
  mapInquiry,
  mapListing,
  mapOpportunity,
  mapProfile,
  mapReport,
  mapTransportPlan,
  mapVerificationReview,
  listingToRow,
  profileToRow
} from './mappers';
import type {
  CategoryRow,
  ContributionRow,
  GroupMemberRow,
  InquiryEventRow,
  InquiryRow,
  ListingReportRow,
  ListingWithImagesRow,
  OpportunityRow,
  ProfileRow,
  ProducerGroupRow,
  TransportPlanRow,
  VerificationReviewRow
} from './rows';

const LISTING_SELECT = '*, listing_images(*)';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Supabase-backed repository.
 *
 * Every query runs under Row Level Security as the current user, with the anon
 * key only — there is no service-role path in this codebase. The application
 * level ownership checks below are kept deliberately: they give people readable
 * error messages, while RLS stays the real security boundary.
 */
export function createSupabaseRepo(client: SupabaseClient): Repo {
  async function membershipsFor(profileIds: string[]): Promise<GroupMemberRow[]> {
    if (profileIds.length === 0) return [];
    const { data, error } = await client
      .from('group_members')
      .select('group_id, profile_id')
      .in('profile_id', profileIds);
    if (error) throw new Error(error.message);
    return (data ?? []) as GroupMemberRow[];
  }

  async function profileRows(apply?: (q: any) => any): Promise<ProfileRow[]> {
    const base = client.from('profiles').select('*');
    const { data, error } = await (apply ? apply(base) : base);
    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileRow[];
  }

  async function loadProfile(row: ProfileRow): Promise<Profile> {
    const members = await membershipsFor([row.id]);
    return mapProfile(
      row,
      members.filter((m) => m.profile_id === row.id).map((m) => m.group_id)
    );
  }

  async function aggregateFor(opportunityIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (opportunityIds.length === 0) return map;
    const { data, error } = await client
      .from('group_contributions')
      .select('opportunity_id, quantity')
      .in('opportunity_id', opportunityIds)
      .neq('status', 'withdrawn');
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as { opportunity_id: string; quantity: number }[]) {
      map.set(row.opportunity_id, (map.get(row.opportunity_id) ?? 0) + row.quantity);
    }
    return map;
  }

  async function fetchListing(id: string): Promise<Listing | undefined> {
    const { data, error } = await client.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapListing(data as ListingWithImagesRow) : undefined;
  }

  async function fetchOpportunity(idOrSlug: string): Promise<CollectiveOpportunity | undefined> {
    const base = client.from('collective_opportunities').select('*');
    const query = UUID_RE.test(idOrSlug) ? base.eq('id', idOrSlug) : base.eq('slug', idOrSlug);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return undefined;
    const row = data as OpportunityRow;
    const aggregates = await aggregateFor([row.id]);
    return mapOpportunity(row, aggregates.get(row.id) ?? 0);
  }

  async function fetchGroups(): Promise<ProducerGroup[]> {
    const { data, error } = await client.from('producer_groups').select('*').order('name');
    if (error) throw new Error(error.message);
    const { data: memberData, error: memberError } = await client
      .from('group_members')
      .select('group_id, profile_id');
    if (memberError) throw new Error(memberError.message);
    const members = (memberData ?? []) as GroupMemberRow[];
    return ((data ?? []) as ProducerGroupRow[]).map((row) => mapGroup(row, members));
  }

  async function currentUserId(): Promise<string | null> {
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  }

  async function currentProfileId(): Promise<string | null> {
    const userId = await currentUserId();
    if (!userId) return null;
    const rows = await profileRows((q) => q.eq('user_id', userId).limit(1));
    return rows[0]?.id ?? null;
  }

  async function contributionsRaw(opportunityId: string): Promise<ContributionRow[]> {
    const { data, error } = await client
      .from('group_contributions')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []) as ContributionRow[];
  }

  async function eventsFor(inquiryIds: string[]): Promise<InquiryEventRow[]> {
    if (inquiryIds.length === 0) return [];
    const { data, error } = await client
      .from('inquiry_events')
      .select('*')
      .in('inquiry_id', inquiryIds)
      .order('at');
    if (error) throw new Error(error.message);
    return (data ?? []) as InquiryEventRow[];
  }

  async function inquiriesRaw(apply: (q: any) => any): Promise<Inquiry[]> {
    const base = client.from('inquiries').select('*').order('created_at', { ascending: false });
    const { data, error } = await apply(base);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as InquiryRow[];
    const events = await eventsFor(rows.map((r) => r.id));
    return rows.map((row) => mapInquiry(row, events.filter((e) => e.inquiry_id === row.id)));
  }

  async function stockFor(producerProfileId: string, categoryId: string): Promise<number> {
    const { data, error } = await client
      .from('listings')
      .select('available_quantity, availability')
      .eq('producer_id', producerProfileId)
      .eq('category_id', categoryId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { available_quantity: number; availability: string }[]).reduce(
      (sum, l) => sum + (l.availability === 'unavailable' ? 0 : l.available_quantity),
      0
    );
  }

  return {
    async listCategories() {
      const { data, error } = await client.from('categories').select('*').order('name');
      if (error) throw new Error(error.message);
      return ((data ?? []) as CategoryRow[]).map(mapCategory);
    },

    async listPublicListings() {
      const { data, error } = await client
        .from('listings')
        .select(LISTING_SELECT)
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ListingWithImagesRow[]).map(mapListing);
    },

    getListing: fetchListing,
    getListingBySlug: async (slug) => {
      const { data, error } = await client.from('listings').select(LISTING_SELECT).eq('slug', slug).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapListing(data as ListingWithImagesRow) : undefined;
    },

    async listListingsByProducer(profileId) {
      const { data, error } = await client
        .from('listings')
        .select(LISTING_SELECT)
        .eq('producer_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ListingWithImagesRow[]).map(mapListing);
    },

    async relatedListings(listing) {
      const { data, error } = await client
        .from('listings')
        .select(LISTING_SELECT)
        .eq('published', true)
        .neq('id', listing.id)
        .or(`category_id.eq.${listing.categoryId},producer_id.eq.${listing.producerId}`)
        .limit(4);
      if (error) throw new Error(error.message);
      return ((data ?? []) as ListingWithImagesRow[]).map(mapListing);
    },

    async getProfile(id) {
      const rows = await profileRows((q) => q.eq('id', id).limit(1));
      return rows[0] ? loadProfile(rows[0]) : undefined;
    },

    async getProfileByUserId(userId) {
      const rows = await profileRows((q) => q.eq('user_id', userId).limit(1));
      return rows[0] ? loadProfile(rows[0]) : undefined;
    },

    async listPublicProfiles() {
      const rows = await profileRows();
      const members = await membershipsFor(rows.map((r) => r.id));
      return rows.map((row) =>
        mapProfile(
          row,
          members.filter((m) => m.profile_id === row.id).map((m) => m.group_id)
        )
      );
    },

    async upsertProfile(profile) {
      const userId = await currentUserId();
      if (!userId) throw new Error('Sign in before saving a profile.');
      // The database owner is always the signed-in account, never the caller.
      const row: Record<string, unknown> = { ...profileToRow(profile), user_id: userId };
      if (!UUID_RE.test(String(row.id))) delete row.id;

      const { data, error } = await client.from('profiles').upsert(row, { onConflict: 'id' }).select('*').single();
      if (error) throw new Error(error.message);
      return loadProfile(data as ProfileRow);
    },

    async createListing(listing) {
      const row = listingToRow(listing) as Record<string, unknown>;
      // Postgres assigns the id; a demo-style id must not be sent to a uuid column.
      delete row.id;
      const { data, error } = await client.from('listings').insert(row).select('id').single();
      if (error) throw new Error(error.message);
      const createdId = (data as { id: string }).id;

      if (listing.images.length > 0) {
        const { error: imageError } = await client.from('listing_images').insert(
          listing.images.map((image) => ({
            listing_id: createdId,
            caption: image.caption,
            src: image.src,
            alt: image.alt,
            consent_recorded: image.consentRecorded,
            is_sample: image.isSample
          }))
        );
        if (imageError) throw new Error(`Listing saved but its images failed: ${imageError.message}`);
      }
      return (await fetchListing(createdId)) as Listing;
    },

    async updateListing(id, patch, actorProfileId) {
      const current = await fetchListing(id);
      if (!current) throw new Error('Listing not found.');
      if (current.producerId !== actorProfileId) {
        throw new Error('Not allowed to edit another producer’s listing.');
      }
      const next: Listing = { ...current, ...patch, id: current.id };
      const row = listingToRow(next) as Record<string, unknown>;
      delete row.id;
      const { error } = await client.from('listings').update(row).eq('id', id);
      if (error) throw new Error(error.message);

      if (patch.images) {
        const { error: deleteError } = await client.from('listing_images').delete().eq('listing_id', id);
        if (deleteError) throw new Error(deleteError.message);
        if (next.images.length > 0) {
          const { error: insertError } = await client.from('listing_images').insert(
            next.images.map((image) => ({
              listing_id: id,
              caption: image.caption,
              src: image.src,
              alt: image.alt,
              consent_recorded: image.consentRecorded,
              is_sample: image.isSample
            }))
          );
          if (insertError) throw new Error(insertError.message);
        }
      }
      return (await fetchListing(id)) as Listing;
    },

    listGroups: fetchGroups,
    getGroup: async (id) => (await fetchGroups()).find((g) => g.id === id),
    listOpportunities: async () => {
      const { data, error } = await client
        .from('collective_opportunities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as OpportunityRow[];
      const aggregates = await aggregateFor(rows.map((r) => r.id));
      return rows.map((row) => mapOpportunity(row, aggregates.get(row.id) ?? 0));
    },
    getOpportunity: fetchOpportunity,

    listContributions: async (opportunityId) => (await contributionsRaw(opportunityId)).map(mapContribution),

    async contribute({ opportunityId, producerProfileId, quantity, note }) {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive whole number.');
      }
      const opportunity = await fetchOpportunity(opportunityId);
      if (!opportunity) throw new Error('Opportunity not found.');
      if (opportunity.status === 'closed' || opportunity.status === 'fulfilled' || opportunity.status === 'cancelled') {
        throw new Error('This opportunity is not accepting contributions.');
      }
      if (opportunity.coordinatorProfileId !== producerProfileId) {
        const group = opportunity.organizingGroupId ? await fetchGroups().then((gs) => gs.find((g) => g.id === opportunity.organizingGroupId)) : undefined;
        if (!group?.memberProfileIds.includes(producerProfileId)) {
          throw new Error('Only members of the organizing group can contribute to this opportunity.');
        }
      }

      const availableStock = await stockFor(producerProfileId, opportunity.categoryId);
      if (availableStock <= 0) throw new Error('No stock in a matching category to contribute.');

      const existing = (await contributionsRaw(opportunityId)).find(
        (c) => c.producer_profile_id === producerProfileId && c.status !== 'withdrawn'
      );
      const alreadyCommitted = existing?.quantity ?? 0;
      if (alreadyCommitted + quantity > availableStock) {
        throw new Error(
          `Only ${availableStock - alreadyCommitted} units left to contribute from your stock of ${availableStock}.`
        );
      }
      if (opportunity.aggregateQuantity + quantity > opportunity.targetQuantity * 2) {
        throw new Error('Contribution would exceed twice the target quantity. Please coordinate with the group.');
      }

      if (existing) {
        const { data, error } = await client
          .from('group_contributions')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (error) throw new Error(error.message);
        return mapContribution(data as ContributionRow);
      }

      const { data, error } = await client
        .from('group_contributions')
        .insert({
          opportunity_id: opportunityId,
          producer_profile_id: producerProfileId,
          quantity,
          status: 'pending',
          note: note ?? null
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapContribution(data as ContributionRow);
    },

    listInquiriesForListing: async (listingId) => inquiriesRaw((q) => q.eq('listing_id', listingId)),

    async listInquiriesForSeller(sellerProfileId) {
      const { data, error } = await client.from('listings').select('id').eq('producer_id', sellerProfileId);
      if (error) throw new Error(error.message);
      const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
      if (ids.length === 0) return [];
      return inquiriesRaw((q) => q.in('listing_id', ids));
    },

    async createInquiry(input) {
      if (input.idempotencyKey) {
        const { data: existing, error: existingError } = await client
          .from('inquiries')
          .select('*')
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle();
        if (existingError) throw new Error(existingError.message);
        if (existing) {
          const row = existing as InquiryRow;
          return mapInquiry(row, await eventsFor([row.id]));
        }
      }

      const listing = await fetchListing(input.listingId);
      if (!listing) throw new Error('Listing not found.');
      if (!listing.published) throw new Error('This listing is not published.');
      if (!Number.isInteger(input.quantity) || input.quantity < listing.minOrderQuantity) {
        throw new Error(`Quantity must be a whole number of at least ${listing.minOrderQuantity}.`);
      }
      if (listing.availability === 'unavailable') throw new Error('This listing is currently unavailable.');
      if (input.quantity > listing.availableQuantity && listing.availability !== 'made_to_order') {
        throw new Error(`Only ${listing.availableQuantity} ${listing.unitOfSale} available right now.`);
      }

      const buyerProfileId = await currentProfileId();
      const { data, error } = await client
        .from('inquiries')
        .insert({
          reference: makeReference(),
          listing_id: listing.id,
          buyer_name: input.buyerName.trim(),
          buyer_contact: input.buyerContact.trim(),
          quantity: input.quantity,
          unit: listing.unitOfSale as UnitOfSale,
          unit_price_cents: listing.unitPrice.cents,
          estimated_subtotal_cents: multiplyUnitPrice(listing.unitPrice.cents, input.quantity),
          currency: listing.unitPrice.currency,
          preference: input.preference,
          preferred_date: input.preferredDate ?? null,
          message: input.message.trim(),
          status: 'new',
          idempotency_key: input.idempotencyKey ?? null,
          buyer_profile_id: buyerProfileId
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      const row = data as InquiryRow;
      const { error: eventError } = await client.from('inquiry_events').insert({
        inquiry_id: row.id,
        actor: 'buyer',
        kind: 'created',
        detail: `Inquiry submitted for ${row.quantity} ${row.unit}.`
      });
      if (eventError) throw new Error(`Inquiry saved but the event log failed: ${eventError.message}`);
      return mapInquiry(row, await eventsFor([row.id]));
    },

    async updateInquiryStatus(inquiryId, status, actor, detail) {
      const { data: current, error: currentError } = await client
        .from('inquiries')
        .select('*')
        .eq('id', inquiryId)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error('Inquiry not found.');
      if (current.status === 'completed' || current.status === 'cancelled') {
        throw new Error('Cannot change a closed inquiry.');
      }

      const { data: updated, error } = await client
        .from('inquiries')
        .update({ status })
        .eq('id', inquiryId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      const { error: eventError } = await client.from('inquiry_events').insert({
        inquiry_id: inquiryId,
        actor,
        kind: 'status_changed',
        detail
      });
      if (eventError) throw new Error(`Status saved but the event log failed: ${eventError.message}`);
      return mapInquiry(updated as InquiryRow, await eventsFor([inquiryId]));
    },

    async listReports() {
      const { data, error } = await client.from('listing_reports').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ListingReportRow[]).map(mapReport);
    },

    async createReport(input) {
      const { data, error } = await client
        .from('listing_reports')
        .insert({
          listing_id: input.listingId,
          reason: input.reason,
          reporter_name: input.reporterName,
          reporter_contact: input.reporterContact,
          status: 'open'
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapReport(data as ListingReportRow);
    },

    async listVerificationReviews() {
      const { data, error } = await client
        .from('verification_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as VerificationReviewRow[]).map(mapVerificationReview);
    },

    async recordVerificationReview(input) {
      const { data, error } = await client
        .from('verification_reviews')
        .insert({
          profile_id: input.profileId,
          reviewer_profile_id: input.reviewerProfileId,
          decision: input.decision,
          reason: input.reason
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      const verification =
        input.decision === 'approved' ? 'verified' : input.decision === 'rejected' ? 'unverified' : 'pending_review';
      const { error: profileError } = await client
        .from('profiles')
        .update({ verification, verification_note: input.reason })
        .eq('id', input.profileId);
      if (profileError) {
        throw new Error(`Decision recorded but the profile was not updated: ${profileError.message}`);
      }
      return mapVerificationReview(data as VerificationReviewRow);
    },

    async getTransportPlan(opportunityId) {
      const { data, error } = await client
        .from('transport_plans')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? (mapTransportPlan(data as TransportPlanRow) as TransportPlan) : undefined;
    },

    async aggregateStats() {
      const count = async (table: string, apply?: (q: any) => any): Promise<number> => {
        const base = client.from(table).select('*', { count: 'exact', head: true });
        const { count: value, error } = await (apply ? apply(base) : base);
        if (error) throw new Error(error.message);
        return value ?? 0;
      };

      const { data: contributionRows, error: contributionError } = await client
        .from('group_contributions')
        .select('quantity')
        .neq('status', 'withdrawn');
      if (contributionError) throw new Error(contributionError.message);
      const contributed = ((contributionRows ?? []) as { quantity: number }[]).reduce((s, r) => s + r.quantity, 0);

      const { data: targetRows, error: targetError } = await client
        .from('collective_opportunities')
        .select('target_quantity');
      if (targetError) throw new Error(targetError.message);
      const target = ((targetRows ?? []) as { target_quantity: number }[]).reduce((s, r) => s + r.target_quantity, 0);

      return {
        listings: await count('listings', (q) => q.eq('published', true)),
        producers: await count('profiles'),
        groups: await count('producer_groups'),
        inquiries: await count('inquiries'),
        opportunities: await count('collective_opportunities'),
        collectiveContributed: contributed,
        collectiveTarget: target,
        verified: await count('profiles', (q) => q.eq('verification', 'verified'))
      };
    }
  };
}
