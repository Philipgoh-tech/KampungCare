import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// PDPA-compliant user profiles: never stores raw NRIC, unit numbers, or raw ID documents.
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull().default(''),
  role: text('role').notNull().default('PARENT'), // PARENT | SITTER | ADMIN
  phoneE164: text('phone_e164'), // Stored privately; gated behind CONFIRMED booking
  neighborhood: text('neighborhood'),
  postalCode: text('postal_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Vetted babysitter profiles (publicly exposes district/neighborhood + masked isVetted boolean only).
export const sitterProfiles = pgTable('sitter_profiles', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id')
    .references(() => profiles.id)
    .notNull()
    .unique(),
  displayName: text('display_name').notNull(),
  headline: text('headline').notNull(),
  bio: text('bio').notNull(),
  avatarKey: text('avatar_key').notNull().default('meilin'),
  neighborhood: text('neighborhood').notNull(),
  postalCode: text('postal_code').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  hourlyRateSgd: integer('hourly_rate_sgd').notNull(), // SGD 18–28/hr
  yearsExperience: integer('years_experience').notNull().default(3),
  ageGroups: jsonb('age_groups').$type<string[]>().notNull(),
  languages: text('languages').notNull().default('English'),
  certifications: text('certifications').notNull().default('Child First Aid'),
  isVetted: boolean('is_vetted').notNull().default(false),
  vettingStatus: text('vetting_status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED
  isAvailable: boolean('is_available').notNull().default(true),
  ratingAvg: doublePrecision('rating_avg').notNull().default(4.9),
  reviewCount: integer('review_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Booking state machine: DRAFT -> PENDING_PAYMENT -> CONFIRMED -> COMPLETED (or CANCELLED)
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingCode: text('booking_code').notNull().unique(),
  parentProfileId: integer('parent_profile_id')
    .references(() => profiles.id)
    .notNull(),
  sitterProfileId: integer('sitter_profile_id')
    .references(() => sitterProfiles.id)
    .notNull(),
  serviceDate: text('service_date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull(), // HH:MM
  endTime: text('end_time').notNull(), // HH:MM
  durationHours: doublePrecision('duration_hours').notNull(),
  numChildren: integer('num_children').notNull().default(1),
  childrenAges: text('children_ages').notNull().default('Toddler (2 yrs)'),
  postalCode: text('postal_code').notNull(),
  buildingName: text('building_name').notNull(),
  streetAddress: text('street_address').notNull(),
  emergencyNotes: text('emergency_notes').notNull().default(''),
  hourlyRateSgd: integer('hourly_rate_sgd').notNull(),
  subtotalSgdCents: integer('subtotal_sgd_cents').notNull(),
  platformFeeSgdCents: integer('platform_fee_sgd_cents').notNull(),
  sitterPayoutSgdCents: integer('sitter_payout_sgd_cents').notNull(),
  totalSgdCents: integer('total_sgd_cents').notNull(),
  status: text('status').notNull().default('PENDING_PAYMENT'), // DRAFT | PENDING_PAYMENT | CONFIRMED | COMPLETED | CANCELLED
  paymentMethod: text('payment_method').notNull().default('paynow'), // paynow | card
  stripeSessionId: text('stripe_session_id'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  sitterProfileId: integer('sitter_profile_id')
    .references(() => sitterProfiles.id)
    .notNull(),
  parentName: text('parent_name').notNull(),
  neighborhood: text('neighborhood').notNull().default('Singapore'),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  sitterProfile: one(sitterProfiles, {
    fields: [profiles.id],
    references: [sitterProfiles.profileId],
  }),
  parentBookings: many(bookings),
}));

export const sitterProfilesRelations = relations(sitterProfiles, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [sitterProfiles.profileId],
    references: [profiles.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  parent: one(profiles, {
    fields: [bookings.parentProfileId],
    references: [profiles.id],
  }),
  sitter: one(sitterProfiles, {
    fields: [bookings.sitterProfileId],
    references: [sitterProfiles.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  sitter: one(sitterProfiles, {
    fields: [reviews.sitterProfileId],
    references: [sitterProfiles.id],
  }),
}));
