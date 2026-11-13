export type ActiveTab = 'find' | 'bookings' | 'sitter' | 'admin' | 'faq';

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type VettingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: 'PARENT' | 'SITTER' | 'ADMIN';
  phoneE164: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  isAdmin: boolean;
}

export interface OneMapLocation {
  postalCode: string;
  buildingName: string;
  streetAddress: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  source: 'onemap' | 'singapore-district-fallback';
}

export interface SitterItem {
  id: number;
  displayName: string;
  headline: string;
  bio: string;
  avatarKey: string;
  neighborhood: string;
  postalDistrict: string;
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

export interface ParentBooking {
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
  paymentMethod: 'paynow' | 'card';
  paidAt: string | null;
  whatsappCoordinationUrl: string | null;
  counterpartMaskedPhone: string | null;
}

export interface SitterBookingItem {
  id: number;
  bookingCode: string;
  parentName: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  numChildren: number;
  childrenAges: string;
  buildingName: string;
  streetAddress: string;
  postalCode: string;
  emergencyNotes: string;
  sitterPayoutSgdCents: number;
  status: BookingStatus;
  whatsappParentUrl: string | null;
  maskedParentPhone: string | null;
}

export interface ReviewItem {
  id: number;
  sitterProfileId: number;
  sitterName: string;
  parentName: string;
  neighborhood: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AdminSitterRow {
  id: number;
  displayName: string;
  headline: string;
  bio: string;
  neighborhood: string;
  postalDistrict: string;
  hourlyRateSgd: number;
  yearsExperience: number;
  languages: string;
  certifications: string;
  isVetted: boolean;
  vettingStatus: VettingStatus;
  isAvailable: boolean;
}

export interface InquiryRow {
  id: number;
  name: string;
  email: string;
  details: string;
  status: string;
  createdAt: string;
}
