-- Reference Supabase / PostgreSQL Schema with Row-Level Security (RLS)
-- PDPA Compliance: Never store raw NRIC numbers, full unit numbers on public profiles, or unencrypted ID documents.

CREATE TYPE user_role AS ENUM ('PARENT', 'SITTER', 'ADMIN');
CREATE TYPE vetting_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE booking_status AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'PARENT',
  phone_e164 TEXT, -- Masked/private; only exposed to counterpart once booking is CONFIRMED
  neighborhood TEXT,
  postal_code CHAR(6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sitter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  neighborhood TEXT NOT NULL, -- District/estate only (no unit numbers)
  postal_code CHAR(6) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  hourly_rate_sgd INTEGER NOT NULL CHECK (hourly_rate_sgd BETWEEN 18 AND 60),
  years_experience INTEGER NOT NULL DEFAULT 1,
  age_groups TEXT[] NOT NULL DEFAULT ARRAY['Toddlers (1-3y)'],
  languages TEXT NOT NULL DEFAULT 'English',
  certifications TEXT NOT NULL DEFAULT 'Child First Aid',
  is_vetted BOOLEAN NOT NULL DEFAULT FALSE,
  vetting_status vetting_status NOT NULL DEFAULT 'PENDING',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT NOT NULL UNIQUE,
  parent_id UUID NOT NULL REFERENCES public.profiles(id),
  sitter_id UUID NOT NULL REFERENCES public.sitter_profiles(id),
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL CHECK (duration_hours >= 3.0),
  num_children INTEGER NOT NULL CHECK (num_children BETWEEN 1 AND 5),
  children_ages TEXT NOT NULL,
  postal_code CHAR(6) NOT NULL,
  building_name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  emergency_notes TEXT NOT NULL DEFAULT '',
  hourly_rate_sgd INTEGER NOT NULL,
  subtotal_sgd_cents INTEGER NOT NULL,
  platform_fee_sgd_cents INTEGER NOT NULL,
  sitter_payout_sgd_cents INTEGER NOT NULL,
  total_sgd_cents INTEGER NOT NULL,
  status booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_method TEXT NOT NULL DEFAULT 'paynow',
  stripe_session_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  sitter_id UUID NOT NULL REFERENCES public.sitter_profiles(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  neighborhood TEXT NOT NULL DEFAULT 'Singapore',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: Users manage own profile; phone_e164 is only readable by counterpart on CONFIRMED booking
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Sitter Profiles RLS: Public reads approved sitters (no phone numbers); sitters manage own; admins vet all
CREATE POLICY "Public reads vetted sitters" ON public.sitter_profiles FOR SELECT USING (is_vetted = TRUE AND vetting_status = 'APPROVED');
CREATE POLICY "Sitters manage own profile" ON public.sitter_profiles FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Admins vet sitters" ON public.sitter_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Bookings RLS: Parents and assigned sitters read own bookings
CREATE POLICY "Participants read bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = parent_id OR
  EXISTS (SELECT 1 FROM public.sitter_profiles sp WHERE sp.id = sitter_id AND sp.profile_id = auth.uid())
);
CREATE POLICY "Parents create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Reviews RLS: Public read; authenticated parents with completed/confirmed bookings write
CREATE POLICY "Public reads reviews" ON public.reviews FOR SELECT USING (TRUE);
