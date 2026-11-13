import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import { bookings, inquiries, profiles, reviews, sitterProfiles } from './src/db/schema.ts';
import { getOrCreateProfile } from './src/db/users.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  calculateHaversineKm,
  lookupSingaporePostalCode,
} from './src/lib/onemap.ts';
import {
  createSgdStripeCheckoutSession,
  stripeClient,
} from './src/lib/stripe.ts';
import {
  buildWhatsappCoordinationLink,
  dispatchBookingConfirmationAlert,
  maskSingaporePhone,
} from './src/lib/notifications.ts';
import {
  BookingStatus,
  calculateSgdPricing,
  computeHoursBetween,
  createBookingSchema,
  formatSgd,
  inquirySchema,
  postalSearchSchema,
  SG_PHONE_REGEX,
  SG_POSTAL_REGEX,
  sitterApplicationSchema,
} from './src/lib/validation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_EMAIL_SET = new Set(
  (process.env.ADMIN_EMAILS || 'GohTengLee@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAIL_SET.has(email.toLowerCase());
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Stripe Webhook must receive the raw body before express.json() parses it
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!stripeClient || !webhookSecret || !signature || typeof signature !== 'string') {
        return res.status(400).json({ error: 'Stripe webhook not configured.' });
      }

      try {
        const event = stripeClient.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const bookingIdStr = session.metadata?.bookingId;
          if (bookingIdStr) {
            const bookingId = Number(bookingIdStr);
            const updated = await db
              .update(bookings)
              .set({
                status: 'CONFIRMED',
                paidAt: new Date(),
                stripeSessionId: session.id,
              })
              .where(eq(bookings.id, bookingId))
              .returning();

            if (updated[0]) {
              const sitterRows = await db
                .select()
                .from(sitterProfiles)
                .where(eq(sitterProfiles.id, updated[0].sitterProfileId))
                .limit(1);

              dispatchBookingConfirmationAlert({
                bookingCode: updated[0].bookingCode,
                parentEmail: session.customer_email || 'parent@kampungcare.sg',
                sitterName: sitterRows[0]?.displayName || 'Your KampungCare Sitter',
                serviceDate: updated[0].serviceDate,
                totalSgdFormatted: formatSgd(updated[0].totalSgdCents),
              });
            }
          }
        }

        return res.json({ received: true });
      } catch (err) {
        console.error('Stripe webhook verification failed:', err);
        return res.status(400).json({ error: 'Webhook signature verification failed.' });
      }
    }
  );

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'kampungcare-sg' });
  });

  // Public OneMap 6-digit Singapore postal code lookup
  app.get('/api/onemap/lookup', async (req, res) => {
    const parsed = postalSearchSchema.safeParse({
      postalCode: String(req.query.postalCode || ''),
    });

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid 6-digit Singapore postal code.',
      });
    }

    try {
      const result = await lookupSingaporePostalCode(parsed.data.postalCode);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  // Public Sitter Feed (PDPA-compliant: zero phone numbers or residential unit numbers exposed)
  app.get('/api/sitters', async (req, res) => {
    try {
      const postalCode = typeof req.query.postalCode === 'string' ? req.query.postalCode.trim() : '';
      const radiusKm = Number(req.query.radiusKm || 15);
      const maxRate = Number(req.query.maxRate || 45);
      const ageGroup = typeof req.query.ageGroup === 'string' ? req.query.ageGroup.trim() : '';
      const vettedOnly = req.query.vettedOnly !== 'false';

      let searchLocation: Awaited<ReturnType<typeof lookupSingaporePostalCode>> | null = null;
      if (postalCode && SG_POSTAL_REGEX.test(postalCode)) {
        searchLocation = await lookupSingaporePostalCode(postalCode);
      }

      const rows = await db
        .select()
        .from(sitterProfiles)
        .orderBy(desc(sitterProfiles.ratingAvg));

      const filtered = rows
        .filter((s) => {
          if (vettedOnly && (!s.isVetted || s.vettingStatus !== 'APPROVED')) return false;
          if (!s.isAvailable) return false;
          if (s.hourlyRateSgd > maxRate) return false;
          if (ageGroup && ageGroup !== 'ALL') {
            const groups = Array.isArray(s.ageGroups) ? s.ageGroups : [];
            if (!groups.includes(ageGroup)) return false;
          }
          return true;
        })
        .map((s) => {
          const distanceKm = searchLocation
            ? calculateHaversineKm(
                searchLocation.latitude,
                searchLocation.longitude,
                s.latitude,
                s.longitude
              )
            : undefined;

          return {
            id: s.id,
            displayName: s.displayName,
            headline: s.headline,
            bio: s.bio,
            avatarKey: s.avatarKey,
            neighborhood: s.neighborhood,
            postalDistrict: s.postalCode.slice(0, 2),
            latitude: s.latitude,
            longitude: s.longitude,
            distanceKm,
            hourlyRateSgd: s.hourlyRateSgd,
            yearsExperience: s.yearsExperience,
            ageGroups: Array.isArray(s.ageGroups) ? s.ageGroups : [],
            languages: s.languages,
            certifications: s.certifications,
            isVetted: s.isVetted,
            vettingStatus: s.vettingStatus,
            isAvailable: s.isAvailable,
            ratingAvg: s.ratingAvg,
            reviewCount: s.reviewCount,
          };
        })
        .filter((s) => {
          if (searchLocation && typeof s.distanceKm === 'number' && radiusKm > 0) {
            return s.distanceKm <= radiusKm;
          }
          return true;
        })
        .sort((a, b) => {
          if (typeof a.distanceKm === 'number' && typeof b.distanceKm === 'number') {
            return a.distanceKm - b.distanceKm;
          }
          return b.ratingAvg - a.ratingAvg;
        });

      return res.json({
        searchLocation,
        sitters: filtered,
      });
    } catch (error) {
      console.error('Failed to query sitters:', error);
      return res.status(500).json({ error: 'Unable to load babysitters right now.' });
    }
  });

  // Public parent reviews
  app.get('/api/reviews', async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: reviews.id,
          sitterProfileId: reviews.sitterProfileId,
          sitterName: sitterProfiles.displayName,
          parentName: reviews.parentName,
          neighborhood: reviews.neighborhood,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .innerJoin(sitterProfiles, eq(reviews.sitterProfileId, sitterProfiles.id))
        .orderBy(desc(reviews.createdAt))
        .limit(12);

      return res.json({ reviews: rows });
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return res.status(500).json({ error: 'Failed to load reviews.' });
    }
  });

  // Public inquiry form submission
  app.post('/api/inquiries', async (req, res) => {
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please complete all required inquiry fields.',
      });
    }

    try {
      const created = await db
        .insert(inquiries)
        .values({
          name: parsed.data.name,
          email: parsed.data.email,
          details: parsed.data.details,
          status: 'NEW',
        })
        .returning();

      return res.status(201).json({
        inquiry: created[0],
        message: 'Inquiry received. Our Singapore care concierge will reply via email within 2 hours.',
      });
    } catch (error) {
      console.error('Failed to save inquiry:', error);
      return res.status(500).json({ error: 'Could not submit inquiry. Please try again.' });
    }
  });

  // Authenticated User Profile
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const name = req.user!.name || '';
      let profile = await getOrCreateProfile(uid, email, name);

      // Auto-elevate configured founder/admin email
      if (isAdminEmail(email) && profile.role !== 'ADMIN') {
        const updated = await db
          .update(profiles)
          .set({ role: 'ADMIN' })
          .where(eq(profiles.id, profile.id))
          .returning();
        profile = updated[0];
      }

      const ownSitterRows = await db
        .select()
        .from(sitterProfiles)
        .where(eq(sitterProfiles.profileId, profile.id))
        .limit(1);

      return res.json({
        profile: {
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          role: profile.role,
          phoneE164: profile.phoneE164,
          neighborhood: profile.neighborhood,
          postalCode: profile.postalCode,
          isAdmin: profile.role === 'ADMIN' || isAdminEmail(profile.email),
        },
        sitterProfile: ownSitterRows[0] || null,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      return res.status(500).json({ error: 'Failed to load user profile.' });
    }
  });

  app.patch('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const profile = await getOrCreateProfile(uid, email, req.user!.name);

      const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : profile.fullName;
      const phoneE164 = typeof req.body.phoneE164 === 'string' ? req.body.phoneE164.trim() : profile.phoneE164;
      const postalCode = typeof req.body.postalCode === 'string' ? req.body.postalCode.trim() : profile.postalCode;

      if (phoneE164 && !SG_PHONE_REGEX.test(phoneE164)) {
        return res.status(400).json({ error: 'Phone number must be a valid Singapore number (+658xxxxxxx or +659xxxxxxx).' });
      }
      if (postalCode && !SG_POSTAL_REGEX.test(postalCode)) {
        return res.status(400).json({ error: 'Postal code must be 6 digits.' });
      }

      let neighborhood = profile.neighborhood;
      if (postalCode) {
        const geo = await lookupSingaporePostalCode(postalCode);
        neighborhood = geo.neighborhood;
      }

      const updated = await db
        .update(profiles)
        .set({
          fullName,
          phoneE164: phoneE164 || null,
          postalCode: postalCode || null,
          neighborhood: neighborhood || null,
        })
        .where(eq(profiles.id, profile.id))
        .returning();

      return res.json({ profile: updated[0] });
    } catch (error) {
      console.error('Failed to update profile:', error);
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // Create Booking & Stripe/PayNow Checkout Session
  app.post('/api/checkout', requireAuth, async (req: AuthRequest, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid booking details.',
      });
    }

    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const parentProfile = await getOrCreateProfile(uid, email, req.user!.name);

      // Persist parent's Singapore WhatsApp phone & postal code privately
      await db
        .update(profiles)
        .set({
          phoneE164: parsed.data.parentPhone,
          postalCode: parsed.data.postalCode,
        })
        .where(eq(profiles.id, parentProfile.id));

      const sitterRows = await db
        .select()
        .from(sitterProfiles)
        .where(eq(sitterProfiles.id, parsed.data.sitterProfileId))
        .limit(1);

      const sitter = sitterRows[0];
      if (!sitter || !sitter.isVetted || sitter.vettingStatus !== 'APPROVED') {
        return res.status(404).json({ error: 'Selected babysitter is not currently available.' });
      }

      const durationHours = computeHoursBetween(parsed.data.startTime, parsed.data.endTime);
      if (durationHours < 3) {
        return res.status(400).json({ error: 'Minimum booking duration is 3 hours.' });
      }

      const addressInfo = await lookupSingaporePostalCode(parsed.data.postalCode);
      const pricing = calculateSgdPricing(
        sitter.hourlyRateSgd,
        durationHours,
        parsed.data.numChildren
      );

      const bookingCode = `KC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const createdRows = await db
        .insert(bookings)
        .values({
          bookingCode,
          parentProfileId: parentProfile.id,
          sitterProfileId: sitter.id,
          serviceDate: parsed.data.serviceDate,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          durationHours,
          numChildren: parsed.data.numChildren,
          childrenAges: parsed.data.childrenAges,
          postalCode: addressInfo.postalCode,
          buildingName: addressInfo.buildingName,
          streetAddress: addressInfo.streetAddress,
          emergencyNotes: parsed.data.emergencyNotes || '',
          hourlyRateSgd: pricing.effectiveHourlyRateSgd,
          subtotalSgdCents: pricing.subtotalSgdCents,
          platformFeeSgdCents: pricing.platformFeeSgdCents,
          sitterPayoutSgdCents: pricing.sitterPayoutSgdCents,
          totalSgdCents: pricing.totalSgdCents,
          status: 'PENDING_PAYMENT',
          paymentMethod: parsed.data.paymentMethod,
        })
        .returning();

      const booking = createdRows[0];
      const appUrl =
        process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      const checkout = await createSgdStripeCheckoutSession({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        sitterName: sitter.displayName,
        serviceDate: booking.serviceDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationHours,
        totalSgdCents: booking.totalSgdCents,
        platformFeeSgdCents: booking.platformFeeSgdCents,
        sitterPayoutSgdCents: booking.sitterPayoutSgdCents,
        paymentMethod: parsed.data.paymentMethod,
        parentEmail: email,
        appUrl,
      });

      await db
        .update(bookings)
        .set({ stripeSessionId: checkout.sessionId })
        .where(eq(bookings.id, booking.id));

      return res.status(201).json({
        mode: checkout.mode,
        sessionId: checkout.sessionId,
        checkoutUrl: checkout.checkoutUrl,
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          sitterProfileId: sitter.id,
          sitterName: sitter.displayName,
          sitterNeighborhood: sitter.neighborhood,
          sitterAvatarKey: sitter.avatarKey,
          serviceDate: booking.serviceDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          durationHours: booking.durationHours,
          numChildren: booking.numChildren,
          childrenAges: booking.childrenAges,
          postalCode: booking.postalCode,
          buildingName: booking.buildingName,
          streetAddress: booking.streetAddress,
          emergencyNotes: booking.emergencyNotes,
          hourlyRateSgd: booking.hourlyRateSgd,
          subtotalSgdCents: booking.subtotalSgdCents,
          platformFeeSgdCents: booking.platformFeeSgdCents,
          sitterPayoutSgdCents: booking.sitterPayoutSgdCents,
          totalSgdCents: booking.totalSgdCents,
          status: booking.status,
          paymentMethod: booking.paymentMethod,
          paidAt: null,
          // Privacy Gate: Strictly null while PENDING_PAYMENT
          whatsappCoordinationUrl: null,
          counterpartMaskedPhone: null,
        },
      });
    } catch (error) {
      console.error('Checkout creation error:', error);
      return res.status(500).json({ error: 'Unable to initiate checkout right now.' });
    }
  });

  // Sandbox Checkout Verification (used when Stripe live keys are not set in env)
  app.post('/api/checkout/confirm-simulated', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.body.bookingId);
      if (!bookingId) {
        return res.status(400).json({ error: 'Missing bookingId.' });
      }

      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const parentProfile = await getOrCreateProfile(uid, email, req.user!.name);

      const existingRows = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.parentProfileId, parentProfile.id)
          )
        )
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        return res.status(404).json({ error: 'Booking not found.' });
      }

      const updatedRows = await db
        .update(bookings)
        .set({
          status: 'CONFIRMED',
          paidAt: new Date(),
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      const updated = updatedRows[0];

      const sitterJoin = await db
        .select({
          sitter: sitterProfiles,
          sitterUser: profiles,
        })
        .from(sitterProfiles)
        .innerJoin(profiles, eq(sitterProfiles.profileId, profiles.id))
        .where(eq(sitterProfiles.id, updated.sitterProfileId))
        .limit(1);

      const sitter = sitterJoin[0]?.sitter;
      const sitterPhone = sitterJoin[0]?.sitterUser.phoneE164;

      dispatchBookingConfirmationAlert({
        bookingCode: updated.bookingCode,
        parentEmail: email,
        sitterName: sitter?.displayName || 'Your Sitter',
        serviceDate: updated.serviceDate,
        totalSgdFormatted: formatSgd(updated.totalSgdCents),
      });

      const status = updated.status as BookingStatus;
      const whatsappUrl = buildWhatsappCoordinationLink({
        bookingCode: updated.bookingCode,
        bookingStatus: status,
        recipientPhoneE164: sitterPhone,
        sitterName: sitter?.displayName || 'Sitter',
        serviceDate: updated.serviceDate,
        startTime: updated.startTime,
        endTime: updated.endTime,
        neighborhood: sitter?.neighborhood || 'Singapore',
      });

      return res.json({
        booking: {
          ...updated,
          sitterName: sitter?.displayName || 'Sitter',
          sitterNeighborhood: sitter?.neighborhood || 'Singapore',
          sitterAvatarKey: sitter?.avatarKey || 'meilin',
          whatsappCoordinationUrl: whatsappUrl,
          counterpartMaskedPhone: maskSingaporePhone(sitterPhone, status),
        },
      });
    } catch (error) {
      console.error('Simulated payment confirmation failed:', error);
      return res.status(500).json({ error: 'Payment confirmation failed.' });
    }
  });

  // Parent Bookings List (Privacy-gated WhatsApp URL)
  app.get('/api/bookings/parent', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const parentProfile = await getOrCreateProfile(uid, email, req.user!.name);

      const rows = await db
        .select({
          booking: bookings,
          sitter: sitterProfiles,
          sitterUser: profiles,
        })
        .from(bookings)
        .innerJoin(sitterProfiles, eq(bookings.sitterProfileId, sitterProfiles.id))
        .innerJoin(profiles, eq(sitterProfiles.profileId, profiles.id))
        .where(eq(bookings.parentProfileId, parentProfile.id))
        .orderBy(desc(bookings.createdAt));

      const result = rows.map(({ booking, sitter, sitterUser }) => {
        const status = booking.status as BookingStatus;
        // Strict Privacy Gate: only expose phone & wa.me link when CONFIRMED or COMPLETED
        const whatsappUrl = buildWhatsappCoordinationLink({
          bookingCode: booking.bookingCode,
          bookingStatus: status,
          recipientPhoneE164: sitterUser.phoneE164,
          sitterName: sitter.displayName,
          serviceDate: booking.serviceDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          neighborhood: sitter.neighborhood,
        });

        return {
          id: booking.id,
          bookingCode: booking.bookingCode,
          sitterProfileId: sitter.id,
          sitterName: sitter.displayName,
          sitterNeighborhood: sitter.neighborhood,
          sitterAvatarKey: sitter.avatarKey,
          serviceDate: booking.serviceDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          durationHours: booking.durationHours,
          numChildren: booking.numChildren,
          childrenAges: booking.childrenAges,
          postalCode: booking.postalCode,
          buildingName: booking.buildingName,
          streetAddress: booking.streetAddress,
          emergencyNotes: booking.emergencyNotes,
          hourlyRateSgd: booking.hourlyRateSgd,
          subtotalSgdCents: booking.subtotalSgdCents,
          platformFeeSgdCents: booking.platformFeeSgdCents,
          sitterPayoutSgdCents: booking.sitterPayoutSgdCents,
          totalSgdCents: booking.totalSgdCents,
          status,
          paymentMethod: booking.paymentMethod,
          paidAt: booking.paidAt ? booking.paidAt.toISOString() : null,
          whatsappCoordinationUrl: whatsappUrl,
          counterpartMaskedPhone: maskSingaporePhone(sitterUser.phoneE164, status),
        };
      });

      return res.json({ bookings: result });
    } catch (error) {
      console.error('Failed to fetch parent bookings:', error);
      return res.status(500).json({ error: 'Unable to load bookings.' });
    }
  });

  app.post('/api/bookings/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.params.id);
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const parentProfile = await getOrCreateProfile(uid, email, req.user!.name);

      const updated = await db
        .update(bookings)
        .set({ status: 'CANCELLED' })
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.parentProfileId, parentProfile.id)
          )
        )
        .returning();

      if (!updated[0]) {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      return res.json({ booking: updated[0] });
    } catch (error) {
      console.error('Cancel booking error:', error);
      return res.status(500).json({ error: 'Unable to cancel booking.' });
    }
  });

  // Sitter Dashboard: Apply / Register Sitter Profile (enters Admin Vetting Queue as PENDING)
  app.post('/api/sitter/apply', requireAuth, async (req: AuthRequest, res) => {
    const parsed = sitterApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid sitter application fields.',
      });
    }

    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const profile = await getOrCreateProfile(uid, email, parsed.data.displayName);

      const geo = await lookupSingaporePostalCode(parsed.data.postalCode);

      await db
        .update(profiles)
        .set({
          fullName: parsed.data.displayName,
          phoneE164: parsed.data.phoneE164,
          postalCode: parsed.data.postalCode,
          neighborhood: parsed.data.neighborhood || geo.neighborhood,
          role: profile.role === 'ADMIN' ? 'ADMIN' : 'SITTER',
        })
        .where(eq(profiles.id, profile.id));

      const existing = await db
        .select()
        .from(sitterProfiles)
        .where(eq(sitterProfiles.profileId, profile.id))
        .limit(1);

      if (existing[0]) {
        const updated = await db
          .update(sitterProfiles)
          .set({
            displayName: parsed.data.displayName,
            headline: parsed.data.headline,
            bio: parsed.data.bio,
            neighborhood: parsed.data.neighborhood || geo.neighborhood,
            postalCode: parsed.data.postalCode,
            latitude: geo.latitude,
            longitude: geo.longitude,
            hourlyRateSgd: parsed.data.hourlyRateSgd,
            yearsExperience: parsed.data.yearsExperience,
            ageGroups: parsed.data.ageGroups,
            languages: parsed.data.languages,
            certifications: parsed.data.certifications,
          })
          .where(eq(sitterProfiles.id, existing[0].id))
          .returning();
        return res.json({ sitterProfile: updated[0] });
      }

      const inserted = await db
        .insert(sitterProfiles)
        .values({
          profileId: profile.id,
          displayName: parsed.data.displayName,
          headline: parsed.data.headline,
          bio: parsed.data.bio,
          avatarKey: 'claire',
          neighborhood: parsed.data.neighborhood || geo.neighborhood,
          postalCode: parsed.data.postalCode,
          latitude: geo.latitude,
          longitude: geo.longitude,
          hourlyRateSgd: parsed.data.hourlyRateSgd,
          yearsExperience: parsed.data.yearsExperience,
          ageGroups: parsed.data.ageGroups,
          languages: parsed.data.languages,
          certifications: parsed.data.certifications,
          isVetted: false,
          vettingStatus: 'PENDING',
          isAvailable: true,
          ratingAvg: 5.0,
          reviewCount: 0,
        })
        .returning();

      return res.status(201).json({ sitterProfile: inserted[0] });
    } catch (error) {
      console.error('Sitter application error:', error);
      return res.status(500).json({ error: 'Unable to submit sitter application.' });
    }
  });

  // Sitter Dashboard: Toggle availability
  app.patch('/api/sitter/availability', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const profile = await getOrCreateProfile(uid, email, req.user!.name);
      const isAvailable = Boolean(req.body.isAvailable);

      const updated = await db
        .update(sitterProfiles)
        .set({ isAvailable })
        .where(eq(sitterProfiles.profileId, profile.id))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({ error: 'No sitter profile found for this account.' });
      }
      return res.json({ sitterProfile: updated[0] });
    } catch (error) {
      console.error('Availability toggle error:', error);
      return res.status(500).json({ error: 'Failed to update availability.' });
    }
  });

  // Sitter Dashboard: View assigned bookings + privacy-gated WhatsApp parent button
  app.get('/api/sitter/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const profile = await getOrCreateProfile(uid, email, req.user!.name);

      const ownSitterRows = await db
        .select()
        .from(sitterProfiles)
        .where(eq(sitterProfiles.profileId, profile.id))
        .limit(1);

      const ownSitter = ownSitterRows[0];
      if (!ownSitter) {
        return res.json({ sitterProfile: null, bookings: [] });
      }

      const rows = await db
        .select({
          booking: bookings,
          parent: profiles,
        })
        .from(bookings)
        .innerJoin(profiles, eq(bookings.parentProfileId, profiles.id))
        .where(eq(bookings.sitterProfileId, ownSitter.id))
        .orderBy(desc(bookings.createdAt));

      const formatted = rows.map(({ booking, parent }) => {
        const status = booking.status as BookingStatus;
        const whatsappUrl = buildWhatsappCoordinationLink({
          bookingCode: booking.bookingCode,
          bookingStatus: status,
          recipientPhoneE164: parent.phoneE164,
          sitterName: parent.fullName || 'Parent',
          serviceDate: booking.serviceDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          neighborhood: booking.buildingName,
        });

        return {
          id: booking.id,
          bookingCode: booking.bookingCode,
          parentName: parent.fullName || 'Parent',
          serviceDate: booking.serviceDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          durationHours: booking.durationHours,
          numChildren: booking.numChildren,
          childrenAges: booking.childrenAges,
          buildingName: booking.buildingName,
          streetAddress: booking.streetAddress,
          postalCode: booking.postalCode,
          emergencyNotes: booking.emergencyNotes,
          sitterPayoutSgdCents: booking.sitterPayoutSgdCents,
          status,
          whatsappParentUrl: whatsappUrl,
          maskedParentPhone: maskSingaporePhone(parent.phoneE164, status),
        };
      });

      return res.json({
        sitterProfile: ownSitter,
        bookings: formatted,
      });
    } catch (error) {
      console.error('Failed to fetch sitter bookings:', error);
      return res.status(500).json({ error: 'Unable to load sitter bookings.' });
    }
  });

  // Admin Vetting Queue: Protected list of sitters + inquiries
  app.get('/api/admin/sitters', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const profile = await getOrCreateProfile(uid, email, req.user!.name);

      if (profile.role !== 'ADMIN' && !isAdminEmail(email)) {
        return res.status(403).json({
          error: 'Admin access required. Sign in with an authorized founder/admin account.',
        });
      }

      const allSitters = await db
        .select({
          id: sitterProfiles.id,
          displayName: sitterProfiles.displayName,
          headline: sitterProfiles.headline,
          bio: sitterProfiles.bio,
          neighborhood: sitterProfiles.neighborhood,
          postalDistrict: sitterProfiles.postalCode,
          hourlyRateSgd: sitterProfiles.hourlyRateSgd,
          yearsExperience: sitterProfiles.yearsExperience,
          languages: sitterProfiles.languages,
          certifications: sitterProfiles.certifications,
          isVetted: sitterProfiles.isVetted,
          vettingStatus: sitterProfiles.vettingStatus,
          isAvailable: sitterProfiles.isAvailable,
          createdAt: sitterProfiles.createdAt,
        })
        .from(sitterProfiles)
        .orderBy(desc(sitterProfiles.createdAt));

      const recentInquiries = await db
        .select()
        .from(inquiries)
        .orderBy(desc(inquiries.createdAt))
        .limit(20);

      return res.json({
        sitters: allSitters.map((s) => ({
          ...s,
          // PDPA minimization: expose only 2-digit postal sector in Admin queue
          postalDistrict: s.postalDistrict.slice(0, 2),
        })),
        inquiries: recentInquiries,
      });
    } catch (error) {
      console.error('Admin queue load error:', error);
      return res.status(500).json({ error: 'Failed to load admin vetting queue.' });
    }
  });

  // Admin Vetting Queue: Approve or Reject sitter profile
  app.patch('/api/admin/sitters/:id/vet', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@kampungcare.sg`;
      const profile = await getOrCreateProfile(uid, email, req.user!.name);

      if (profile.role !== 'ADMIN' && !isAdminEmail(email)) {
        return res.status(403).json({ error: 'Admin access required.' });
      }

      const sitterId = Number(req.params.id);
      const decision = req.body.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';

      const updated = await db
        .update(sitterProfiles)
        .set({
          vettingStatus: decision,
          isVetted: decision === 'APPROVED',
        })
        .where(eq(sitterProfiles.id, sitterId))
        .returning();

      if (!updated[0]) {
        return res.status(404).json({ error: 'Sitter profile not found.' });
      }

      return res.json({ sitter: updated[0] });
    } catch (error) {
      console.error('Admin vet error:', error);
      return res.status(500).json({ error: 'Failed to update vetting decision.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KampungCare Singapore server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
