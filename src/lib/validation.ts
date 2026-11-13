import { z } from 'zod';

export const SG_POSTAL_REGEX = /^\d{6}$/;
export const SG_PHONE_REGEX = /^\+65[689]\d{7}$/;

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type VettingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserRole = 'PARENT' | 'SITTER' | 'ADMIN';
export type PaymentMethod = 'paynow' | 'card';

export interface SitterPublicProfile {
  id: number;
  displayName: string;
  headline: string;
  bio: string;
  avatarKey: string;
  neighborhood: string;
  postalDistrict: string; // First 2 digits only for PDPA minimization
  latitude: number;
  longitude: number;
  distanceKm?: number;
  hourlyRateSgd: number;
  yearsExperience: number;
  ageGroups: string[];
  languages: string;
  certifications: string;
  isVetted: boolean;
  vettingStatus: VettingStatus;
  isAvailable: boolean;
  ratingAvg: number;
  reviewCount: number;
}

export interface BookingSummary {
  id: number;
  bookingCode: string;
  sitterProfileId: number;
  sitterName: string;
  sitterNeighborhood: string;
  sitterAvatarKey: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  numChildren: number;
  childrenAges: string;
  postalCode: string;
  buildingName: string;
  streetAddress: string;
  emergencyNotes: string;
  hourlyRateSgd: number;
  subtotalSgdCents: number;
  platformFeeSgdCents: number;
  sitterPayoutSgdCents: number;
  totalSgdCents: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paidAt: string | null;
  // Privacy Gate: Strictly null unless booking.status === 'CONFIRMED'
  whatsappCoordinationUrl: string | null;
  counterpartMaskedPhone: string | null;
}

export const postalSearchSchema = z.object({
  postalCode: z
    .string()
    .trim()
    .regex(SG_POSTAL_REGEX, 'Enter a valid 6-digit Singapore postal code (e.g. 160055).'),
});

export const createBookingSchema = z
  .object({
    sitterProfileId: z.number().int().positive(),
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a valid service date.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Select a valid start time.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Select a valid end time.'),
    numChildren: z.number().int().min(1).max(4),
    childrenAges: z.string().trim().min(2).max(120),
    postalCode: z
      .string()
      .trim()
      .regex(SG_POSTAL_REGEX, 'Enter a valid 6-digit Singapore postal code.'),
    parentPhone: z
      .string()
      .trim()
      .regex(
        SG_PHONE_REGEX,
        'Enter a valid Singapore mobile number starting with +65 (e.g. +6591234567).'
      ),
    emergencyNotes: z.string().trim().max(500).optional().default(''),
    paymentMethod: z.enum(['paynow', 'card']).default('paynow'),
  })
  .refine(
    (data) => {
      const hours = computeHoursBetween(data.startTime, data.endTime);
      return hours >= 3;
    },
    {
      message: 'Minimum booking block is 3 hours per Singapore care guidelines.',
      path: ['endTime'],
    }
  );

export const sitterApplicationSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(10).max(140),
  bio: z.string().trim().min(20).max(600),
  neighborhood: z.string().trim().min(2).max(80),
  postalCode: z
    .string()
    .trim()
    .regex(SG_POSTAL_REGEX, 'Enter a valid 6-digit Singapore postal code.'),
  phoneE164: z
    .string()
    .trim()
    .regex(SG_PHONE_REGEX, 'Enter a valid Singapore mobile number (+658xxxxxxx or +659xxxxxxx).'),
  hourlyRateSgd: z.number().int().min(18).max(45),
  yearsExperience: z.number().int().min(1).max(40),
  ageGroups: z.array(z.string()).min(1),
  languages: z.string().trim().min(2).max(120),
  certifications: z.string().trim().min(2).max(160),
});

export const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.'),
  details: z
    .string()
    .trim()
    .min(10, 'Please share a few details about your family or care needs.')
    .max(1500),
});

export function computeHoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) {
    // Allow overnight sessions ending past midnight up to 12 hours
    endMinutes += 24 * 60;
  }
  const diffHours = (endMinutes - startMinutes) / 60;
  return diffHours > 12 ? 0 : Number(diffHours.toFixed(2));
}

export function calculateSgdPricing(
  hourlyRateSgd: number,
  durationHours: number,
  numChildren: number
) {
  // Transparent Singapore pricing: base hourly rate + $3/hr per additional child beyond first
  const extraChildSurchargePerHr = Math.max(0, numChildren - 1) * 3;
  const effectiveHourlyRateSgd = hourlyRateSgd + extraChildSurchargePerHr;
  const subtotalSgdCents = Math.round(effectiveHourlyRateSgd * durationHours * 100);
  // 15% platform service & vetting fee; 85% goes directly to the babysitter
  const platformFeeSgdCents = Math.round(subtotalSgdCents * 0.15);
  const sitterPayoutSgdCents = subtotalSgdCents - platformFeeSgdCents;
  const totalSgdCents = subtotalSgdCents;

  return {
    effectiveHourlyRateSgd,
    subtotalSgdCents,
    platformFeeSgdCents,
    sitterPayoutSgdCents,
    totalSgdCents,
  };
}

export function formatSgd(cents: number): string {
  return `S$${(cents / 100).toFixed(2)}`;
}
