import { randomUUID } from 'node:crypto';
import { getDemoStore } from './store';
import { makeReference } from './ids';
import { multiplyUnitPrice } from './money';
import { validateSiteSettings } from './settings';
import type { Actor } from './session';
import type { Repo } from './repo';
import type { DB } from './demo-data';
import type {
  AccountStatus,
  AuditAction,
  AuditLogEntry,
  Category,
  CollectiveOpportunity,
  ContactMessage,
  GroupContribution,
  Inquiry,
  InquiryEvent,
  InquiryStatus,
  Listing,
  ListingReport,
  Profile,
  Review,
  Role,
  SiteSettings,
  VerificationReview
} from './types';

/**
 * The demo repository: the same interface the Supabase repository implements,
 * running against the in-memory store. It is separated from repo.ts so the
 * authorization rules below can be exercised by the test suite, and it carries
 * no 'server-only' import for the same reason.
 *
 * In demo mode this object is the only enforcement point — there is no Row Level
 * Security behind it — so every privileged method re-checks the actor here.
 */
export const demoRepo: Repo = {
  async listCategories() {
    // A deactivated category disappears from shopper browsing but keeps the
    // listings that already use it — deactivation is the safe admin action.
    return [...getDemoStore().categories]
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
  async listAllCategories() {
    return [...getDemoStore().categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
  async listPublicListings() {
    return getDemoStore().listings.filter((l) => l.published && !l.archived);
  },
  async getListing(id) {
    return getDemoStore().listings.find((l) => l.id === id);
  },
  async getListingBySlug(slug) {
    return getDemoStore().listings.find((l) => l.slug === slug);
  },
  async listListingsByProducer(profileId) {
    return getDemoStore().listings.filter((l) => l.producerId === profileId);
  },
  async relatedListings(listing) {
    const store = getDemoStore();
    return store.listings
      .filter(
        (l) =>
          l.published &&
          !l.archived &&
          l.id !== listing.id &&
          (l.categoryId === listing.categoryId || l.producerId === listing.producerId)
      )
      .slice(0, 4);
  },
  async getProfile(id) {
    return getDemoStore().profiles.find((p) => p.id === id);
  },
  async getProfileByUserId(userId) {
    return getDemoStore().profiles.find((p) => p.userId === userId);
  },
  async listPublicProfiles() {
    // Only selling accounts are published. A buyer profile is private data and
    // an administrator is not a marketplace participant.
    return getDemoStore().profiles.filter((p) => p.role === 'producer' || p.role === 'coordinator');
  },
  async upsertProfile(profile) {
    const store = getDemoStore();
    const idx = store.profiles.findIndex((p) => p.id === profile.id);
    if (idx < 0) {
      // Registration can create a working account; it can never create an
      // administrator or a group coordinator, whoever the caller claims to be.
      // This mirrors the profiles_guard_admin_insert trigger in 0003.
      if (profile.role === 'admin' || profile.role === 'coordinator') {
        throw new Error('Administrator and coordinator roles are assigned by an existing administrator.');
      }
      store.profiles.push({ ...profile, updatedAt: new Date().toISOString() });
      return profile;
    }
    const current = store.profiles[idx]!;
    const next: Profile = {
      ...profile,
      id: current.id,
      userId: current.userId,
      // Privileged fields are not writable through a profile save.
      role: current.role,
      status: current.status,
      accountKind: current.accountKind,
      verification: current.verification,
      verificationNote: current.verificationNote,
      updatedAt: new Date().toISOString()
    };
    store.profiles[idx] = next;
    return next;
  },
  async createListing(listing) {
    const store = getDemoStore();
    if (store.listings.some((l) => l.id === listing.id || l.slug === listing.slug)) {
      throw new Error('A listing with this id or slug already exists.');
    }
    store.listings.push(listing);
    return listing;
  },
  async updateListing(id, patch, actorProfileId) {
    const store = getDemoStore();
    const idx = store.listings.findIndex((l) => l.id === id);
    if (idx < 0) throw new Error('Listing not found.');
    const current = store.listings[idx]!;
    const actor = store.profiles.find((p) => p.id === actorProfileId);
    const isAdmin = actor?.role === 'admin';
    if (!isAdmin && current.producerId !== actorProfileId) {
      throw new Error('Not allowed to edit another producer’s listing.');
    }
    if (actor?.status === 'suspended') {
      throw new Error('This account is suspended and cannot change listings.');
    }
    const next: Listing = { ...current, ...patch, id: current.id, lastUpdated: new Date().toISOString() };
    store.listings[idx] = next;
    return next;
  },
  async listGroups() {
    return [...getDemoStore().groups];
  },
  async getGroup(id) {
    return getDemoStore().groups.find((g) => g.id === id);
  },
  async listOpportunities() {
    const store = getDemoStore();
    return store.opportunities.map((o) => ({
      ...o,
      aggregateQuantity: store.contributions
        .filter((c) => c.opportunityId === o.id && c.status !== 'withdrawn')
        .reduce((sum, c) => sum + c.quantity, 0)
    }));
  },
  async getOpportunity(idOrSlug) {
    const store = getDemoStore();
    const found = store.opportunities.find((o) => o.id === idOrSlug || o.slug === idOrSlug);
    if (!found) return undefined;
    const aggregate = store.contributions
      .filter((c) => c.opportunityId === found.id && c.status !== 'withdrawn')
      .reduce((sum, c) => sum + c.quantity, 0);
    return { ...found, aggregateQuantity: aggregate };
  },
  async listContributions(opportunityId) {
    return getDemoStore().contributions.filter((c) => c.opportunityId === opportunityId);
  },
  async contribute({ opportunityId, producerProfileId, quantity, note }) {
    const store = getDemoStore();
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
    const producer = store.profiles.find((p) => p.id === producerProfileId);
    if (!producer) throw new Error('No profile found for this account.');
    if (producer.status === 'suspended') throw new Error('This account is suspended and cannot contribute.');
    const opp = store.opportunities.find((o) => o.id === opportunityId);
    if (!opp) throw new Error('Opportunity not found.');
    if (opp.status === 'closed' || opp.status === 'fulfilled' || opp.status === 'cancelled') {
      throw new Error('This opportunity is not accepting contributions.');
    }
    if (opp.coordinatorProfileId !== producerProfileId) {
      const group = store.groups.find((g) => g.id === opp.organizingGroupId);
      if (!group?.memberProfileIds.includes(producerProfileId)) {
        throw new Error('Only members of the organizing group can contribute to this opportunity.');
      }
    }
    const producerListings = store.listings.filter((l) => l.producerId === producerProfileId && l.categoryId === opp.categoryId);
    const availableStock = producerListings.reduce((sum, l) => sum + (l.availability === 'unavailable' ? 0 : l.availableQuantity), 0);
    if (availableStock <= 0) throw new Error('No stock in a matching category to contribute.');
    const existing = store.contributions.find(
      (c) => c.opportunityId === opportunityId && c.producerProfileId === producerProfileId && c.status !== 'withdrawn'
    );
    const alreadyCommitted = existing?.quantity ?? 0;
    if (alreadyCommitted + quantity > availableStock) {
      throw new Error(
        `Only ${availableStock - alreadyCommitted} units left to contribute from your stock of ${availableStock}.`
      );
    }
    const aggregate = store.contributions
      .filter((c) => c.opportunityId === opportunityId && c.status !== 'withdrawn')
      .reduce((sum, c) => sum + c.quantity, 0);
    if (aggregate + quantity > opp.targetQuantity * 2) {
      throw new Error('Contribution would exceed twice the target quantity. Please coordinate with the group.');
    }
    const record: GroupContribution = {
      id: `con_${randomUUID().slice(0, 8)}`,
      opportunityId,
      producerProfileId,
      quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      note,
      isDemo: true
    };
    if (existing) {
      existing.quantity += quantity;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    store.contributions.push(record);
    opp.updatedAt = new Date().toISOString();
    return record;
  },
  async listInquiriesForListing(listingId) {
    return getDemoStore().inquiries.filter((i) => i.listingId === listingId);
  },
  async listInquiriesForSeller(sellerProfileId) {
    const store = getDemoStore();
    const listingIds = new Set(store.listings.filter((l) => l.producerId === sellerProfileId).map((l) => l.id));
    return store.inquiries.filter((i) => listingIds.has(i.listingId));
  },
  async createInquiry(input) {
    const store = getDemoStore();
    if (input.idempotencyKey) {
      const dup = store.inquiries.find((i) => i.idempotencyKey === input.idempotencyKey);
      if (dup) return dup;
    }
    const listing = store.listings.find((l) => l.id === input.listingId);
    if (!listing) throw new Error('Listing not found.');
    if (!Number.isInteger(input.quantity) || input.quantity < listing.minOrderQuantity) {
      throw new Error(`Quantity must be a whole number of at least ${listing.minOrderQuantity}.`);
    }
    if (listing.availability === 'unavailable') throw new Error('This listing is currently unavailable.');
    if (input.quantity > listing.availableQuantity && listing.availability !== 'made_to_order') {
      throw new Error(`Only ${listing.availableQuantity} ${listing.unitOfSale} available right now.`);
    }
    const subtotal = multiplyUnitPrice(listing.unitPrice.cents, input.quantity);
    const nowIso = new Date().toISOString();
    const createdEvent: InquiryEvent = {
      id: `ev_${randomUUID().slice(0, 8)}`,
      inquiryId: '',
      at: nowIso,
      actor: 'buyer',
      kind: 'created',
      detail: `Inquiry submitted for ${input.quantity} ${listing.unitOfSale}.`
    };
    const inquiry: Inquiry = {
      id: `inq_${randomUUID().slice(0, 8)}`,
      reference: makeReference(),
      listingId: listing.id,
      buyerName: input.buyerName.trim(),
      buyerContact: input.buyerContact.trim(),
      buyerProfileId: input.buyerProfileId,
      quantity: input.quantity,
      unitOfSale: listing.unitOfSale,
      estimatedSubtotalCents: subtotal,
      currency: listing.unitPrice.currency,
      preference: input.preference,
      preferredDate: input.preferredDate,
      message: input.message.trim(),
      status: 'new',
      createdAt: nowIso,
      updatedAt: nowIso,
      events: [{ ...createdEvent, inquiryId: '' }],
      isDemo: true,
      idempotencyKey: input.idempotencyKey
    };
    inquiry.events[0]!.inquiryId = inquiry.id;
    store.inquiries.push(inquiry);
    return inquiry;
  },
  async updateInquiryStatus(inquiryId, status, actor, detail) {
    const store = getDemoStore();
    const idx = store.inquiries.findIndex((i) => i.id === inquiryId);
    if (idx < 0) throw new Error('Inquiry not found.');
    const current = store.inquiries[idx]!;
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error('Cannot change a closed inquiry.');
    }
    const next: Inquiry = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      events: [
        ...current.events,
        {
          id: `ev_${randomUUID().slice(0, 8)}`,
          inquiryId: current.id,
          at: new Date().toISOString(),
          actor,
          kind: 'status_changed',
          detail
        }
      ]
    };
    store.inquiries[idx] = next;
    return next;
  },
  async listReports() {
    return getDemoStore().reports;
  },
  async createReport(input) {
    const store = getDemoStore();
    const report: ListingReport = {
      ...input,
      id: `rep_${randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      isDemo: true
    };
    store.reports.push(report);
    return report;
  },
  async listVerificationReviews() {
    return getDemoStore().verificationReviews;
  },
  async recordVerificationReview(input) {
    const store = getDemoStore();
    const reviewer = store.profiles.find((p) => p.id === input.reviewerProfileId);
    if (reviewer?.role !== 'admin') throw new Error('Only an administrator can record a verification decision.');
    if (input.profileId === input.reviewerProfileId) {
      throw new Error('A reviewer cannot decide their own verification request.');
    }
    if (input.decision === 'rejected' && !input.reason.trim()) {
      throw new Error('A rejection needs a reason the producer can act on.');
    }
    const record: VerificationReview = {
      id: `vr_${randomUUID().slice(0, 8)}`,
      profileId: input.profileId,
      reviewerProfileId: input.reviewerProfileId,
      decision: input.decision,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      isDemo: true
    };
    store.verificationReviews.push(record);
    const profile = store.profiles.find((p) => p.id === input.profileId);
    if (profile) {
      profile.verification =
        input.decision === 'approved' ? 'verified' : input.decision === 'rejected' ? 'unverified' : 'pending_review';
      profile.verificationNote = input.reason;
      profile.updatedAt = new Date().toISOString();
      pushAudit(
        store,
        {
          userId: reviewer!.userId,
          profileId: reviewer!.id,
          role: reviewer!.role,
          accountKind: reviewer!.accountKind,
          status: reviewer!.status
        },
        'verification_decision',
        'profile',
        profile.id,
        `Verification ${input.decision} for ${profile.displayName}: ${input.reason}`
      );
    }
    return record;
  },
  async getTransportPlan(opportunityId) {
    return getDemoStore().transportPlans.find((t) => t.opportunityId === opportunityId);
  },
  async aggregateStats() {
    const store = getDemoStore();
    return {
      listings: store.listings.filter((l) => l.published).length,
      producers: store.profiles.length,
      groups: store.groups.length,
      inquiries: store.inquiries.length,
      opportunities: store.opportunities.length,
      collectiveContributed: store.contributions.filter((c) => c.status !== 'withdrawn').reduce((s, c) => s + c.quantity, 0),
      collectiveTarget: store.opportunities.reduce((s, o) => s + o.targetQuantity, 0),
      verified: store.profiles.filter((p) => p.verification === 'verified').length
    };
  },

  async adminStats() {
    const store = getDemoStore();
    const byRole: Record<Role, number> = { buyer: 0, producer: 0, coordinator: 0, admin: 0 };
    for (const profile of store.profiles) byRole[profile.role] += 1;
    return {
      byRole,
      suspended: store.profiles.filter((p) => p.status === 'suspended').length,
      pendingVerifications: store.profiles.filter((p) => p.verification === 'pending_review').length,
      openReports: store.reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length,
      newInquiries: store.inquiries.filter((i) => i.status === 'new').length,
      openOpportunities: store.opportunities.filter((o) => o.status === 'open' || o.status === 'closing_soon').length,
      publishedListings: store.listings.filter((l) => l.published && !l.archived).length,
      archivedListings: store.listings.filter((l) => l.archived).length,
      hiddenReviews: store.reviews.filter((r) => r.status === 'hidden').length,
      unreadMessages: store.contactMessages.filter((m) => m.status === 'new').length
    };
  },

  async listAllProfiles() {
    return [...getDemoStore().profiles];
  },

  async setProfileRole(profileId, role, actor) {
    requireAdmin(actor, 'change account roles');
    const store = getDemoStore();
    const target = store.profiles.find((p) => p.id === profileId);
    if (!target) throw new Error('Account not found.');
    if (target.id === actor.profileId && role !== 'admin') {
      throw new Error('You cannot remove your own administrator access.');
    }
    if (target.role === 'admin' && role !== 'admin' && activeAdmins(store) <= 1) {
      throw new Error('This is the last active administrator. Promote another account first.');
    }
    const previous = target.role;
    target.role = role;
    target.updatedAt = new Date().toISOString();
    pushAudit(store, actor, 'role_changed', 'profile', target.id, `Role changed from ${previous} to ${role}.`);
    return target;
  },

  async setProfileStatus(profileId, status, actor) {
    requireAdmin(actor, 'suspend or reactivate accounts');
    const store = getDemoStore();
    const target = store.profiles.find((p) => p.id === profileId);
    if (!target) throw new Error('Account not found.');
    if (target.id === actor.profileId && status === 'suspended') {
      throw new Error('You cannot suspend your own account.');
    }
    if (target.role === 'admin' && status === 'suspended' && activeAdmins(store) <= 1) {
      throw new Error('This is the last active administrator. Suspend another account first.');
    }
    target.status = status;
    target.updatedAt = new Date().toISOString();
    pushAudit(
      store,
      actor,
      status === 'suspended' ? 'account_suspended' : 'account_reactivated',
      'profile',
      target.id,
      status === 'suspended' ? 'Account suspended.' : 'Account reactivated.'
    );
    return target;
  },

  async listAllListings() {
    return [...getDemoStore().listings];
  },

  async getInquiry(id) {
    return getDemoStore().inquiries.find((i) => i.id === id);
  },

  async setListingFeatured(id, featured, actor) {
    requireAdmin(actor, 'feature listings');
    const store = getDemoStore();
    const listing = store.listings.find((l) => l.id === id);
    if (!listing) throw new Error('Listing not found.');
    listing.featured = featured;
    listing.lastUpdated = new Date().toISOString();
    pushAudit(
      store,
      actor,
      'listing_featured',
      'listing',
      listing.id,
      `${listing.title} was ${featured ? 'added to' : 'removed from'} the homepage.`
    );
    return listing;
  },

  async setListingPublished(id, published, actor) {
    const store = getDemoStore();
    const listing = store.listings.find((l) => l.id === id);
    if (!listing) throw new Error('Listing not found.');
    requireListingWriter(listing, actor);
    listing.published = published;
    if (published) listing.archived = false;
    listing.lastUpdated = new Date().toISOString();
    if (actor.role === 'admin') {
      pushAudit(store, actor, 'listing_moderated', 'listing', listing.id, `${listing.title} was ${published ? 'published' : 'unpublished'} by moderation.`);
    }
    return listing;
  },

  async archiveListing(id, actor) {
    const store = getDemoStore();
    const listing = store.listings.find((l) => l.id === id);
    if (!listing) throw new Error('Listing not found.');
    requireListingWriter(listing, actor);
    listing.archived = true;
    listing.published = false;
    listing.lastUpdated = new Date().toISOString();
    pushAudit(store, actor, 'record_archived', 'listing', listing.id, `${listing.title} was archived. Its inquiries were kept.`);
    return listing;
  },

  async deleteListing(id, actor) {
    const store = getDemoStore();
    const idx = store.listings.findIndex((l) => l.id === id);
    if (idx < 0) throw new Error('Listing not found.');
    const listing = store.listings[idx]!;
    requireListingWriter(listing, actor);
    const linked = store.inquiries.filter((i) => i.listingId === listing.id).length;
    if (linked > 0) {
      throw new Error(
        `This listing has ${linked} inquiry record(s). Deleting it would break that history — archive it instead.`
      );
    }
    store.listings.splice(idx, 1);
    pushAudit(store, actor, 'record_archived', 'listing', listing.id, `${listing.title} was deleted permanently (no inquiry history attached).`);
  },

  async saveCategory(input, actor) {
    requireAdmin(actor, 'manage categories');
    const store = getDemoStore();
    const name = input.name.trim();
    if (!name) throw new Error('A category needs a name.');
    if (name.length > 80) throw new Error('Category names must be 80 characters or fewer.');
    const slug = (input.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
    if (!slug) throw new Error('Could not build a web address from that name.');
    if (store.categories.some((c) => c.slug === slug && c.id !== input.id)) {
      throw new Error(`Another category already uses the address “${slug}”.`);
    }
    const existing = store.categories.find((c) => c.id === input.id);
    const record: Category = {
      id: input.id || `cat_${randomUUID().slice(0, 8)}`,
      name,
      slug,
      kind: input.kind,
      description: input.description.trim(),
      icon: input.icon?.trim() || undefined,
      sortOrder: Number.isInteger(input.sortOrder) ? input.sortOrder! : (store.categories.length + 1) * 10,
      active: input.active ?? true
    };
    if (existing) {
      Object.assign(existing, record);
    } else {
      store.categories.push(record);
    }
    pushAudit(
      store,
      actor,
      'category_changed',
      'category',
      record.id,
      `Category “${record.name}” ${existing ? 'updated' : 'created'} (active: ${String(record.active)}).`
    );
    return record;
  },

  async deleteCategory(id, actor) {
    requireAdmin(actor, 'delete categories');
    const store = getDemoStore();
    const listings = store.listings.filter((l) => l.categoryId === id).length;
    const opportunities = store.opportunities.filter((o) => o.categoryId === id).length;
    if (listings + opportunities > 0) {
      throw new Error(
        `${listings} listing(s) and ${opportunities} opportunity(s) still use this category. Deactivate it instead of deleting.`
      );
    }
    const idx = store.categories.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error('Category not found.');
    const [removed] = store.categories.splice(idx, 1);
    pushAudit(store, actor, 'category_changed', 'category', id, `Category “${removed?.name ?? id}” deleted.`);
  },

  async saveOpportunity(input, actor) {
    if (actor.role !== 'admin' && actor.role !== 'coordinator') {
      throw new Error('Only a group coordinator or administrator can create or edit a collective opportunity.');
    }
    requireActive(actor);
    const store = getDemoStore();
    if (!Number.isInteger(input.targetQuantity) || input.targetQuantity < 1) {
      throw new Error('Target quantity must be a whole number of at least 1.');
    }
    if (input.title.trim().length < 6) throw new Error('Give the opportunity a title of at least 6 characters.');
    const existing = input.id ? store.opportunities.find((o) => o.id === input.id) : undefined;
    if (existing && existing.coordinatorProfileId !== actor.profileId && actor.role !== 'admin') {
      throw new Error('Only the coordinating account can edit this opportunity.');
    }
    const nowIso = new Date().toISOString();
    const record: CollectiveOpportunity = {
      ...(existing ?? {}),
      ...input,
      id: existing?.id ?? `col_${randomUUID().slice(0, 8)}`,
      aggregateQuantity: 0,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      isDemo: true
    };
    if (existing) Object.assign(existing, record);
    else store.opportunities.push(record);
    pushAudit(
      store,
      actor,
      'record_archived',
      'opportunity',
      record.id,
      `Collective opportunity “${record.title}” ${existing ? 'updated' : 'created'} (target ${record.targetQuantity} ${record.unitOfSale}).`
    );
    const aggregate = store.contributions
      .filter((c) => c.opportunityId === record.id && c.status !== 'withdrawn')
      .reduce((sum, c) => sum + c.quantity, 0);
    return { ...record, aggregateQuantity: aggregate };
  },

  async setOpportunityStatus(id, status, actor) {
    const store = getDemoStore();
    const opportunity = store.opportunities.find((o) => o.id === id);
    if (!opportunity) throw new Error('Opportunity not found.');
    if (actor.role !== 'admin' && opportunity.coordinatorProfileId !== actor.profileId) {
      throw new Error('Only the coordinating account or an administrator can change this status.');
    }
    requireActive(actor);
    if (opportunity.status === 'fulfilled' && status !== 'fulfilled') {
      throw new Error('A fulfilled opportunity cannot be reopened.');
    }
    opportunity.status = status;
    opportunity.updatedAt = new Date().toISOString();
    pushAudit(store, actor, 'record_archived', 'opportunity', id, `Opportunity status set to ${status}.`);
    return opportunity;
  },

  async updateContribution(contributionId, quantity, actor) {
    requireActive(actor);
    const store = getDemoStore();
    const contribution = store.contributions.find((c) => c.id === contributionId);
    if (!contribution) throw new Error('Contribution not found.');
    requireContributionWriter(contribution, store, actor);
    const contributionActor = store.profiles.find((p) => p.id === contribution.producerProfileId);
    if (!contributionActor) throw new Error('The contributing account no longer exists.');
    const opportunity = store.opportunities.find((o) => o.id === contribution.opportunityId);
    if (!opportunity) throw new Error('Opportunity not found.');
    if (opportunity.status !== 'open' && opportunity.status !== 'closing_soon') {
      throw new Error('This opportunity is no longer accepting changes.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
    const stock = store.listings
      .filter((l) => l.producerId === contributionActor.id && l.categoryId === opportunity.categoryId)
      .reduce((sum, l) => sum + (l.availability === 'unavailable' ? 0 : l.availableQuantity), 0);
    if (quantity > stock) {
      throw new Error(`You cannot commit more than your available stock of ${stock} ${opportunity.unitOfSale}.`);
    }
    contribution.quantity = quantity;
    contribution.updatedAt = new Date().toISOString();
    pushAudit(store, actor, 'record_archived', 'opportunity', opportunity.id, `Contribution set to ${quantity} ${opportunity.unitOfSale}.`);
    return contribution;
  },

  async withdrawContribution(contributionId, actor) {
    requireActive(actor);
    const store = getDemoStore();
    const contribution = store.contributions.find((c) => c.id === contributionId);
    if (!contribution) throw new Error('Contribution not found.');
    requireContributionWriter(contribution, store, actor);
    const opportunity = store.opportunities.find((o) => o.id === contribution.opportunityId);
    if (opportunity && (opportunity.status === 'fulfilled' || opportunity.status === 'closed')) {
      throw new Error('This opportunity is already closed, so contributions can no longer be withdrawn.');
    }
    contribution.status = 'withdrawn';
    contribution.updatedAt = new Date().toISOString();
    return contribution;
  },

  async confirmContribution(contributionId, actor) {
    requireActive(actor);
    const store = getDemoStore();
    const contribution = store.contributions.find((c) => c.id === contributionId);
    if (!contribution) throw new Error('Contribution not found.');
    const opportunity = store.opportunities.find((o) => o.id === contribution.opportunityId);
    if (!opportunity) throw new Error('Opportunity not found.');
    if (actor.role !== 'admin' && opportunity.coordinatorProfileId !== actor.profileId) {
      throw new Error('Only the coordinating account can confirm a contribution.');
    }
    contribution.status = 'confirmed';
    contribution.updatedAt = new Date().toISOString();
    return contribution;
  },

  async listInquiriesForBuyer(buyerProfileId) {
    return getDemoStore().inquiries.filter((i) => i.buyerProfileId === buyerProfileId);
  },

  async listAllInquiries() {
    // Administrator queue. In demo mode the admin layout and requireRole are the
    // boundary; in Supabase mode Row Level Security decides.
    return [...getDemoStore().inquiries];
  },

  async listReviews(input) {
    const store = getDemoStore();
    return store.reviews
      .filter((r) => (input?.listingId ? r.listingId === input.listingId : true))
      .filter((r) => input?.includeHidden || r.status === 'published')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async createReview({ listingId, inquiryId, rating, comment, actor, authorName }) {
    if (!actor) throw new Error('Sign in to leave a review.');
    requireActive(actor);
    const store = getDemoStore();
    const inquiry = store.inquiries.find((i) => i.id === inquiryId);
    if (!inquiry) throw new Error('Reviews are only possible for an arrangement you recorded.');
    if (inquiry.listingId !== listingId) throw new Error('That inquiry is not for this listing.');
    if (inquiry.status !== 'completed') {
      throw new Error('A review is only allowed once the arrangement is recorded as completed.');
    }
    if (inquiry.buyerProfileId !== actor.profileId) {
      throw new Error('You can only review your own completed inquiry.');
    }
    if (store.reviews.some((r) => r.inquiryId === inquiryId && r.authorProfileId === actor.profileId)) {
      throw new Error('You have already reviewed this inquiry.');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.');
    const text = comment.trim();
    if (text.length < 4) throw new Error('Add a few words about the experience.');
    if (text.length > 1200) throw new Error('Keep the review under 1200 characters.');
    const listing = store.listings.find((l) => l.id === listingId);
    if (!listing) throw new Error('Listing not found.');
    const record: Review = {
      id: `rev_${randomUUID().slice(0, 8)}`,
      listingId,
      producerProfileId: listing.producerId,
      inquiryId,
      rating: rating as Review['rating'],
      comment: text,
      authorName: authorName.trim() || actor.profileId,
      authorProfileId: actor.profileId,
      status: 'published',
      createdAt: new Date().toISOString(),
      isDemo: true
    };
    store.reviews.unshift(record);
    return record;
  },

  async setReviewStatus(id, status, note, actor) {
    requireAdmin(actor, 'moderate reviews');
    const store = getDemoStore();
    const review = store.reviews.find((r) => r.id === id);
    if (!review) throw new Error('Review not found.');
    review.status = status;
    review.moderationNote = note.trim() || undefined;
    pushAudit(store, actor, 'review_moderated', 'review', id, `Review ${status}${note.trim() ? `: ${note.trim()}` : ''}.`);
    return review;
  },

  async updateReport(id, status, adminNote, actor) {
    requireAdmin(actor, 'moderate reports');
    if (status !== 'resolved' && status !== 'rejected' && !adminNote.trim() && status === 'reviewing') {
      throw new Error('Add a moderator note when you start reviewing a report.');
    }
    const store = getDemoStore();
    const report = store.reports.find((r) => r.id === id);
    if (!report) throw new Error('Report not found.');
    report.status = status;
    report.adminNote = adminNote.trim() || undefined;
    pushAudit(store, actor, 'report_resolved', 'report', id, `Report marked ${status}.`);
    return report;
  },

  async getSiteSettings() {
    return { ...getDemoStore().siteSettings };
  },

  async saveSiteSettings(patch, actor) {
    requireAdmin(actor, 'change site content and appearance');
    const store = getDemoStore();
    const issues = validateSiteSettings(patch);
    const first = Object.values(issues)[0];
    if (first) throw new Error(first);
    const merged: SiteSettings = {
      ...store.siteSettings,
      ...patch,
      updatedAt: new Date().toISOString(),
      updatedByProfileId: actor.profileId
    };
    store.siteSettings = merged;
    pushAudit(store, actor, 'site_settings_changed', 'settings', 'site', 'Site content and appearance updated.');
    return { ...merged };
  },

  async listAuditLogs(limit = 100) {
    return getDemoStore().auditLog.slice(0, limit);
  },

  async createContactMessage(input) {
    const name = input.name.trim();
    const email = input.email.trim();
    const message = input.message.trim();
    if (!name || !email || !message) throw new Error('Name, email and message are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Enter an email address we can reply to.');
    if (message.length < 10) throw new Error('Please add a little more detail (at least 10 characters).');
    if (message.length > 2000) throw new Error('Messages must stay under 2000 characters.');
    const store = getDemoStore();
    const record: ContactMessage = {
      id: `msg_${randomUUID().slice(0, 8)}`,
      name,
      email,
      subject: input.subject.trim() || 'General enquiry',
      message,
      createdAt: new Date().toISOString(),
      status: 'new',
      isDemo: true
    };
    store.contactMessages.unshift(record);
    return record;
  },

  async listContactMessages() {
    return [...getDemoStore().contactMessages];
  },

  async setContactMessageStatus(id, status, actor) {
    requireAdmin(actor, 'manage messages');
    const store = getDemoStore();
    const message = store.contactMessages.find((m) => m.id === id);
    if (!message) throw new Error('Message not found.');
    message.status = status;
    return message;
  }
};

function requireActive(actor: Actor) {
  if (actor.status === 'suspended') {
    throw new Error('This account is suspended. Contact an administrator.');
  }
}

function requireAdmin(actor: Actor, verb: string) {
  requireActive(actor);
  if (actor.role !== 'admin') throw new Error(`Only an administrator can ${verb}.`);
}

function activeAdmins(store: DB): number {
  return store.profiles.filter((p) => p.role === 'admin' && p.status === 'active').length;
}

function requireListingWriter(listing: Listing, actor: Actor) {
  requireActive(actor);
  if (actor.role !== 'admin' && listing.producerId !== actor.profileId) {
    throw new Error('Not allowed to change another producer’s listing.');
  }
}

function requireContributionWriter(contribution: GroupContribution, store: DB, actor: Actor) {
  if (actor.role === 'admin' || contribution.producerProfileId === actor.profileId) return;
  const opportunity = store.opportunities.find((o) => o.id === contribution.opportunityId);
  if (opportunity?.coordinatorProfileId === actor.profileId) return;
  throw new Error('Only the contributing producer, the coordinator, or an administrator can change this contribution.');
}

/**
 * Audit entries hold a safe summary only. Never write a password, token, or key
 * into this log — the summaries below contain names and ids only.
 */
function pushAudit(
  store: DB,
  actor: Actor,
  action: AuditAction,
  recordType: AuditLogEntry['recordType'],
  recordId: string,
  summary: string
) {
  const actorProfile = store.profiles.find((p) => p.id === actor.profileId);
  store.auditLog.unshift({
    id: `aud_${randomUUID().slice(0, 8)}`,
    at: new Date().toISOString(),
    actorProfileId: actor.profileId,
    actorName: actorProfile?.displayName ?? actor.profileId,
    action,
    recordType,
    recordId,
    summary,
    isDemo: true
  });
}
