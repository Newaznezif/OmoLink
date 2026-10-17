import type { SupabaseClient } from '@supabase/supabase-js';
import { multiplyUnitPrice } from '../money';
import { makeReference } from '../ids';
import { validateSiteSettings } from '../settings';
import type {
  AuditAction,
  AuditLogEntry,
  Category,
  CollectiveOpportunity,
  Inquiry,
  Listing,
  Profile,
  ProducerGroup,
  Review,
  Role,
  SiteSettings,
  TransportPlan,
  UnitOfSale
} from '../types';
import type { Repo } from '../repo';
import type { Actor } from '../session';
import {
  categoryToRow,
  listingToRow,
  mapAuditLog,
  mapCategory,
  mapContactMessage,
  mapContribution,
  mapGroup,
  mapInquiry,
  mapListing,
  mapOpportunity,
  mapProfile,
  mapReport,
  mapReview,
  mapSiteSettings,
  mapTransportPlan,
  mapVerificationReview,
  profileToRow,
  siteSettingsToRow
} from './mappers';
import type {
  AuditLogRow,
  CategoryRow,
  ContactMessageRow,
  ContributionRow,
  GroupMemberRow,
  InquiryEventRow,
  InquiryRow,
  ListingReportRow,
  ListingWithImagesRow,
  OpportunityRow,
  ProfileRow,
  ProducerGroupRow,
  ReviewRow,
  SiteSettingsRow,
  TransportPlanRow,
  VerificationReviewRow
} from './rows';

const LISTING_SELECT = '*, listing_images(*)';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgREST reports a refused write with a bare "new row violates row-level
 * security policy". That is true but useless to a producer, so the extra hint is
 * appended while the original message is kept for debugging.
 */
function rlsHint(message: string, hint: string): string {
  return /row-level security|permission/i.test(message) ? `${message} — ${hint}` : message;
}

function requireListingWriter(listing: Listing, actor: Actor) {
  if (actor.status === 'suspended') throw new Error('This account is suspended.');
  if (actor.role !== 'admin' && listing.producerId !== actor.profileId) {
    throw new Error('Not allowed to change another producer’s listing.');
  }
}

function requireContributionWriter(contribution: ContributionRow, actor: Actor) {
  if (actor.status === 'suspended') throw new Error('This account is suspended.');
  if (actor.role === 'admin' || contribution.producer_profile_id === actor.profileId) return;
  throw new Error('Only the contributing producer, the coordinator, or an administrator can change this contribution.');
}

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

  async function categoryRows(): Promise<Category[]> {
    const { data, error } = await client.from('categories').select('*').order('name');
    if (error) throw new Error(error.message);
    // Sorted in code by sort_order (falling back to name order) so a project that
    // has not applied the categories columns yet still works.
    return ((data ?? []) as CategoryRow[])
      .map(mapCategory)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
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

  async function toProfiles(rows: ProfileRow[]): Promise<Profile[]> {
    const members = await membershipsFor(rows.map((r) => r.id));
    return rows.map((row) =>
      mapProfile(
        row,
        members.filter((m) => m.profile_id === row.id).map((m) => m.group_id)
      )
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

  async function fetchInquiry(id: string): Promise<Inquiry | undefined> {
    const rows = await inquiriesRaw((q) => q.eq('id', id).limit(1));
    return rows[0];
  }

  async function contributionsAll(contributionId: string): Promise<ContributionRow[]> {
    const { data, error } = await client
      .from('group_contributions')
      .select('*')
      .eq('id', contributionId);
    if (error) throw new Error(error.message);
    return (data ?? []) as ContributionRow[];
  }

  async function readSiteSettings(): Promise<SiteSettings> {
    const { data, error } = await client
      .from('site_settings')
      .select('*')
      .eq('id', 'site')
      .maybeSingle();
    if (error) {
      // The settings row is presentation, not authorization. If the table is not
      // there yet (migration 0003 not applied), every page would otherwise fail —
      // so fall back to the built-in defaults and say plainly what is missing.
      if (/site_settings|does not exist|relation/i.test(error.message)) {
        console.warn('site_settings is not readable; using built-in defaults. Apply supabase/migrations/0003_admin_accounts_reviews.sql.');
        return mapSiteSettings(null);
      }
      throw new Error(error.message);
    }
    return mapSiteSettings((data as SiteSettingsRow | null) ?? null);
  }

  /**
   * Server-side confirmation that the caller really is an administrator, on top
   * of what the session said and what RLS will enforce. A stale cookie cannot
   * survive this read, because it comes from the profiles row.
   */
  async function requireAdminClient(actor: Actor, verb: string): Promise<void> {
    if (actor.status === 'suspended') throw new Error('This account is suspended.');
    if (actor.role !== 'admin') throw new Error(`Only an administrator can ${verb}.`);
    const rows = await profileRows((q) => q.eq('id', actor.profileId).eq('role', 'admin').limit(1));
    if (rows.length === 0) throw new Error('Administrator access could not be confirmed.');
  }

  async function writeAudit(
    actor: Actor,
    action: AuditAction,
    recordType: AuditLogEntry['recordType'],
    recordId: string,
    summary: string
  ): Promise<void> {
    const { error } = await client.from('audit_logs').insert({
      actor_profile_id: actor.profileId,
      actor_name: actor.profileId,
      action,
      record_type: recordType,
      record_id: recordId,
      summary
    });
    // An audit failure must not pretend the change silently succeeded, but the
    // change itself is already committed — so surface it as a distinct message.
    if (error) throw new Error(`The change was saved but could not be added to the audit log: ${error.message}`);
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
      const rows = await categoryRows();
      // Filtered in code, not in the query, so a project that has not applied
      // the categories columns yet still returns the full set rather than erroring.
      return rows.filter((c) => c.active !== false);
    },

    async listAllCategories() {
      return categoryRows();
    },

    async listPublicListings() {
      const { data, error } = await client
        .from('listings')
        .select(LISTING_SELECT)
        .eq('published', true)
        .eq('archived', false)
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
        .eq('archived', false)
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
      // Only selling accounts are published; a buyer profile is private data and
      // an administrator is not a marketplace participant.
      const rows = await profileRows((q) => q.in('role', ['producer', 'coordinator']));
      return toProfiles(rows);
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
    },

    async adminStats() {
      const countOf = async (table: string, apply?: (q: any) => any): Promise<number> => {
        const base = client.from(table).select('id', { count: 'exact', head: true });
        const { count: value, error } = await (apply ? apply(base) : base);
        if (error) throw new Error(error.message);
        return value ?? 0;
      };

      const byRole: Record<Role, number> = { buyer: 0, producer: 0, coordinator: 0, admin: 0 };
      for (const role of Object.keys(byRole) as Role[]) {
        byRole[role] = await countOf('profiles', (q) => q.eq('role', role));
      }

      return {
        byRole,
        suspended: await countOf('profiles', (q) => q.eq('status', 'suspended')),
        pendingVerifications: await countOf('profiles', (q) => q.eq('verification', 'pending_review')),
        openReports: await countOf('listing_reports', (q) => q.in('status', ['open', 'reviewing'])),
        newInquiries: await countOf('inquiries', (q) => q.eq('status', 'new')),
        openOpportunities: await countOf('collective_opportunities', (q) => q.in('status', ['open', 'closing_soon'])),
        publishedListings: await countOf('listings', (q) => q.eq('published', true).eq('archived', false)),
        archivedListings: await countOf('listings', (q) => q.eq('archived', true)),
        hiddenReviews: await countOf('reviews', (q) => q.eq('status', 'hidden')),
        unreadMessages: await countOf('contact_messages', (q) => q.eq('status', 'new'))
      };
    },

    async listAllProfiles() {
      return toProfiles(await profileRows());
    },

    async setProfileRole(profileId, role, actor) {
      await requireAdminClient(actor, 'change account roles');
      if (actor.profileId === profileId && role !== 'admin') {
        throw new Error('You cannot remove your own administrator access.');
      }
      const target = (await profileRows((q) => q.eq('id', profileId).limit(1)))[0];
      if (!target) throw new Error('Account not found.');
      if (target.role === 'admin' && role !== 'admin') {
        const { count } = await client
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('status', 'active');
        if ((count ?? 0) <= 1) throw new Error('This is the last active administrator. Promote another account first.');
      }
      const { data, error } = await client.from('profiles').update({ role }).eq('id', profileId).select('*').single();
      if (error) throw new Error(rlsHint(error.message, 'Only an existing administrator can change roles.'));
      await writeAudit(actor, 'role_changed', 'profile', profileId, `Role changed from ${target.role} to ${role}.`);
      return loadProfile(data as ProfileRow);
    },

    async setProfileStatus(profileId, status, actor) {
      await requireAdminClient(actor, 'suspend or reactivate accounts');
      if (actor.profileId === profileId && status === 'suspended') {
        throw new Error('You cannot suspend your own account.');
      }
      const target = (await profileRows((q) => q.eq('id', profileId).limit(1)))[0];
      if (!target) throw new Error('Account not found.');
      if (target.role === 'admin' && status === 'suspended') {
        const { count } = await client
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('status', 'active');
        if ((count ?? 0) <= 1) throw new Error('This is the last active administrator. Suspend another account first.');
      }
      const { data, error } = await client
        .from('profiles')
        .update({ status })
        .eq('id', profileId)
        .select('*')
        .single();
      if (error) throw new Error(rlsHint(error.message, 'Only an existing administrator can suspend an account.'));
      await writeAudit(
        actor,
        status === 'suspended' ? 'account_suspended' : 'account_reactivated',
        'profile',
        profileId,
        status === 'suspended' ? 'Account suspended.' : 'Account reactivated.'
      );
      return loadProfile(data as ProfileRow);
    },

    async listAllListings() {
      const { data, error } = await client
        .from('listings')
        .select(LISTING_SELECT)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ListingWithImagesRow[]).map(mapListing);
    },

    getInquiry: fetchInquiry,
    async setListingFeatured(id, featured, actor) {
      await requireAdminClient(actor, 'feature listings');
      const listing = await fetchListing(id);
      if (!listing) throw new Error('Listing not found.');
      const { error } = await client.from('listings').update({ featured }).eq('id', id);
      if (error) throw new Error(error.message);
      await writeAudit(
        actor,
        'listing_featured',
        'listing',
        id,
        `${listing.title} was ${featured ? 'added to' : 'removed from'} the homepage.`
      );
      return (await fetchListing(id)) as Listing;
    },

    async setListingPublished(id, published, actor) {
      const listing = await fetchListing(id);
      if (!listing) throw new Error('Listing not found.');
      requireListingWriter(listing, actor);
      const { error } = await client
        .from('listings')
        .update({ published, archived: published ? false : listing.archived })
        .eq('id', id);
      if (error) throw new Error(error.message);
      if (actor.role === 'admin') {
        await writeAudit(
          actor,
          'listing_moderated',
          'listing',
          id,
          `${listing.title} was ${published ? 'published' : 'unpublished'} by moderation.`
        );
      }
      return (await fetchListing(id)) as Listing;
    },

    async archiveListing(id, actor) {
      const listing = await fetchListing(id);
      if (!listing) throw new Error('Listing not found.');
      requireListingWriter(listing, actor);
      const { error } = await client.from('listings').update({ archived: true, published: false }).eq('id', id);
      if (error) throw new Error(error.message);
      await writeAudit(actor, 'record_archived', 'listing', id, `${listing.title} was archived. Its inquiries were kept.`);
      return (await fetchListing(id)) as Listing;
    },

    async deleteListing(id, actor) {
      const listing = await fetchListing(id);
      if (!listing) throw new Error('Listing not found.');
      requireListingWriter(listing, actor);
      const { count, error: countError } = await client
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', id);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) > 0) {
        throw new Error(
          `This listing has ${count} inquiry record(s). Deleting it would break that history — archive it instead.`
        );
      }
      const { error } = await client.from('listings').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await writeAudit(actor, 'record_archived', 'listing', id, `${listing.title} was deleted permanently (no inquiry history attached).`);
    },

    async saveCategory(input, actor) {
      await requireAdminClient(actor, 'manage categories');
      const name = input.name.trim();
      if (!name) throw new Error('A category needs a name.');
      const slug = (input.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
      if (!slug) throw new Error('Could not build a web address from that name.');
      const record: Category = {
        ...input,
        id: input.id || slug,
        name,
        slug,
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true
      };
      const { data, error } = await client
        .from('categories')
        .upsert(categoryToRow(record) as Record<string, unknown>, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw new Error(rlsHint(error.message, 'Only an administrator can change categories.'));
      await writeAudit(actor, 'category_changed', 'category', record.id, `Category “${record.name}” saved.`);
      return mapCategory(data as CategoryRow);
    },

    async deleteCategory(id, actor) {
      await requireAdminClient(actor, 'delete categories');
      const { count } = await client
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);
      if ((count ?? 0) > 0) {
        throw new Error(`${count} listing(s) still use this category. Deactivate it instead of deleting.`);
      }
      const { error } = await client.from('categories').delete().eq('id', id);
      if (error) {
        throw new Error(
          rlsHint(error.message, 'This category is still referenced by a listing or opportunity, so it cannot be deleted.')
        );
      }
      await writeAudit(actor, 'category_changed', 'category', id, 'Category deleted.');
    },

    async saveOpportunity(input, actor) {
      if (actor.role !== 'admin' && actor.role !== 'coordinator') {
        throw new Error('Only a group coordinator or administrator can create or edit a collective opportunity.');
      }
      if (actor.status === 'suspended') throw new Error('This account is suspended.');
      if (!Number.isInteger(input.targetQuantity) || input.targetQuantity < 1) {
        throw new Error('Target quantity must be a whole number of at least 1.');
      }
      const row: Record<string, unknown> = {
        slug: input.slug,
        title: input.title,
        description: input.description,
        category_id: input.categoryId,
        unit: input.unitOfSale,
        organizing_group_id: input.organizingGroupId || null,
        coordinator_profile_id: input.coordinatorProfileId,
        target_quantity: input.targetQuantity,
        indicative_group_price_cents: input.indicativeGroupPrice?.cents ?? null,
        buyer_offered_price_cents: input.buyerOfferedPrice?.cents ?? null,
        pickup_plan: input.pickupPlan,
        transport_plan: input.transportPlan ?? null,
        order_deadline: input.orderDeadline ?? null,
        status: input.status
      };
      let id = input.id;
      if (id) {
        const { error } = await client.from('collective_opportunities').update(row).eq('id', id);
        if (error) throw new Error(rlsHint(error.message, 'Only the coordinating account can edit this opportunity.'));
      } else {
        const { data, error } = await client.from('collective_opportunities').insert(row).select('id').single();
        if (error) throw new Error(error.message);
        id = (data as { id: string }).id;
      }
      await writeAudit(
        actor,
        'record_archived',
        'opportunity',
        String(id),
        `Collective opportunity “${input.title}” ${input.id ? 'updated' : 'created'}.`
      );
      return (await fetchOpportunity(String(id))) as CollectiveOpportunity;
    },

    async setOpportunityStatus(id, status, actor) {
      const opportunity = await fetchOpportunity(id);
      if (!opportunity) throw new Error('Opportunity not found.');
      if (actor.role !== 'admin' && opportunity.coordinatorProfileId !== actor.profileId) {
        throw new Error('Only the coordinating account or an administrator can change this status.');
      }
      if (actor.status === 'suspended') throw new Error('This account is suspended.');
      if (opportunity.status === 'fulfilled' && status !== 'fulfilled') {
        throw new Error('A fulfilled opportunity cannot be reopened.');
      }
      const { error } = await client.from('collective_opportunities').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      await writeAudit(actor, 'record_archived', 'opportunity', id, `Opportunity status set to ${status}.`);
      return (await fetchOpportunity(id)) as CollectiveOpportunity;
    },

    async updateContribution(contributionId, quantity, actor) {
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
      const rows = await contributionsAll(contributionId);
      const contribution = rows[0];
      if (!contribution) throw new Error('Contribution not found.');
      requireContributionWriter(contribution, actor);
      const { data, error } = await client
        .from('group_contributions')
        .update({ quantity })
        .eq('id', contributionId)
        .select('*')
        .single();
      if (error) throw new Error(rlsHint(error.message, 'This contribution belongs to another account.'));
      await writeAudit(actor, 'record_archived', 'opportunity', contribution.opportunity_id, `Contribution set to ${quantity}.`);
      return mapContribution(data as ContributionRow);
    },

    async withdrawContribution(contributionId, actor) {
      const contribution = (await contributionsAll(contributionId))[0];
      if (!contribution) throw new Error('Contribution not found.');
      requireContributionWriter(contribution, actor);
      const { data, error } = await client
        .from('group_contributions')
        .update({ status: 'withdrawn' })
        .eq('id', contributionId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapContribution(data as ContributionRow);
    },

    async confirmContribution(contributionId, actor) {
      const contribution = (await contributionsAll(contributionId))[0];
      if (!contribution) throw new Error('Contribution not found.');
      const opportunity = await fetchOpportunity(contribution.opportunity_id);
      if (!opportunity) throw new Error('Opportunity not found.');
      if (actor.role !== 'admin' && opportunity.coordinatorProfileId !== actor.profileId) {
        throw new Error('Only the coordinating account can confirm a contribution.');
      }
      const { data, error } = await client
        .from('group_contributions')
        .update({ status: 'confirmed' })
        .eq('id', contributionId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapContribution(data as ContributionRow);
    },

    async listInquiriesForBuyer(buyerProfileId) {
      return inquiriesRaw((q) => q.eq('buyer_profile_id', buyerProfileId));
    },

    async listAllInquiries() {
      // Row Level Security limits this to what the current account may see: an
      // administrator reads the queue, anyone else gets their own records only.
      return inquiriesRaw((q) => q);
    },

    async listReviews(input) {
      const base = client.from('reviews').select('*').order('created_at', { ascending: false });
      const query = input?.listingId ? base.eq('listing_id', input.listingId) : base;
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = ((data ?? []) as ReviewRow[]).map(mapReview);
      return input?.includeHidden ? rows : rows.filter((r) => r.status === 'published');
    },

    async createReview({ listingId, inquiryId, rating, comment, actor, authorName }) {
      if (!actor) throw new Error('Sign in to leave a review.');
      if (actor.status === 'suspended') throw new Error('This account is suspended.');
      const inquiry = await fetchInquiry(inquiryId);
      if (!inquiry) throw new Error('Reviews are only possible for an arrangement you recorded.');
      if (inquiry.listingId !== listingId) throw new Error('That inquiry is not for this listing.');
      if (inquiry.status !== 'completed') {
        throw new Error('A review is only allowed once the arrangement is recorded as completed.');
      }
      if (inquiry.buyerProfileId !== actor.profileId) {
        throw new Error('You can only review your own completed inquiry.');
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.');
      const text = comment.trim();
      if (text.length < 4) throw new Error('Add a few words about the experience.');
      const listing = await fetchListing(listingId);
      if (!listing) throw new Error('Listing not found.');
      const { data, error } = await client
        .from('reviews')
        .insert({
          listing_id: listingId,
          producer_profile_id: listing.producerId,
          inquiry_id: inquiryId,
          rating,
          comment: text,
          author_name: authorName.trim() || actor.profileId,
          author_profile_id: actor.profileId,
          status: 'published'
        })
        .select('*')
        .single();
      if (error) {
        throw new Error(
          rlsHint(
            error.message,
            'A review can only be written by the buyer on a completed inquiry for that listing.'
          )
        );
      }
      return mapReview(data as ReviewRow);
    },

    async setReviewStatus(id, status, note, actor) {
      await requireAdminClient(actor, 'moderate reviews');
      const { data, error } = await client
        .from('reviews')
        .update({ status, moderation_note: note.trim() || null })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      await writeAudit(actor, 'review_moderated', 'review', id, `Review ${status}.`);
      return mapReview(data as ReviewRow);
    },

    async updateReport(id, status, adminNote, actor) {
      await requireAdminClient(actor, 'moderate reports');
      const { data, error } = await client
        .from('listing_reports')
        .update({ status, admin_note: adminNote.trim() || null })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      await writeAudit(actor, 'report_resolved', 'report', id, `Report marked ${status}.`);
      return mapReport(data as ListingReportRow);
    },

    getSiteSettings: readSiteSettings,

    async saveSiteSettings(patch, actor) {
      await requireAdminClient(actor, 'change site content and appearance');
      const issues = validateSiteSettings(patch);
      const first = Object.values(issues)[0];
      if (first) throw new Error(first);
      const current = await readSiteSettings();
      const merged: SiteSettings = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedByProfileId: actor.profileId
      };
      const { error } = await client
        .from('site_settings')
        .update({
          ...siteSettingsToRow(merged),
          updated_at: merged.updatedAt,
          updated_by_profile_id: actor.profileId
        })
        .eq('id', 'site');
      if (error) throw new Error(rlsHint(error.message, 'Only an administrator can change site settings.'));
      await writeAudit(actor, 'site_settings_changed', 'settings', 'site', 'Site content and appearance updated.');
      return merged;
    },

    async listAuditLogs(limit = 100) {
      const { data, error } = await client
        .from('audit_logs')
        .select('*')
        .order('at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return ((data ?? []) as AuditLogRow[]).map(mapAuditLog);
    },

    async createContactMessage(input) {
      const name = input.name.trim();
      const email = input.email.trim();
      const message = input.message.trim();
      if (!name || !email || !message) throw new Error('Name, email and message are required.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Enter an email address we can reply to.');
      if (message.length < 10) throw new Error('Please add a little more detail (at least 10 characters).');
      if (message.length > 2000) throw new Error('Messages must stay under 2000 characters.');
      const { data, error } = await client
        .from('contact_messages')
        .insert({
          name,
          email,
          subject: input.subject.trim() || 'General enquiry',
          message
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapContactMessage(data as ContactMessageRow);
    },

    async listContactMessages() {
      const { data, error } = await client
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(rlsHint(error.message, 'Only an administrator can read messages.'));
      return ((data ?? []) as ContactMessageRow[]).map(mapContactMessage);
    },

    async setContactMessageStatus(id, status, actor) {
      await requireAdminClient(actor, 'manage messages');
      const { data, error } = await client
        .from('contact_messages')
        .update({ status })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapContactMessage(data as ContactMessageRow);
    }
  };
}
