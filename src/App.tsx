import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { AdminVettingQueue } from './components/AdminVettingQueue.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { FaqAndInquiry } from './components/FaqAndInquiry.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ParentBookings } from './components/ParentBookings.tsx';
import { SitterDashboard } from './components/SitterDashboard.tsx';
import { SitterFeed } from './components/SitterFeed.tsx';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  ActiveTab,
  AdminSitterRow,
  InquiryRow,
  OneMapLocation,
  ParentBooking,
  ReviewItem,
  SitterBookingItem,
  SitterItem,
  UserProfile,
} from './types/marketplace.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('find');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ownSitterProfile, setOwnSitterProfile] = useState<SitterItem | null>(null);

  // Parent search & filter state
  const [postalCode, setPostalCode] = useState('');
  const [radiusKm, setRadiusKm] = useState(15);
  const [maxRate, setMaxRate] = useState(30);
  const [ageGroup, setAgeGroup] = useState('ALL');
  const [vettedOnly, setVettedOnly] = useState(true);
  const [searchLocation, setSearchLocation] = useState<OneMapLocation | null>(null);
  const [sitters, setSitters] = useState<SitterItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [sittersLoading, setSittersLoading] = useState(true);
  const [sittersError, setSittersError] = useState<string | null>(null);

  // Booking modal & parent bookings
  const [selectedSitter, setSelectedSitter] = useState<SitterItem | null>(null);
  const [parentBookings, setParentBookings] = useState<ParentBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Sitter dashboard state
  const [sitterBookings, setSitterBookings] = useState<SitterBookingItem[]>([]);
  const [sitterLoading, setSitterLoading] = useState(false);

  // Admin queue state
  const [adminSitters, setAdminSitters] = useState<AdminSitterRow[]>([]);
  const [adminInquiries, setAdminInquiries] = useState<InquiryRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const current = auth.currentUser;
    if (!current) return {};
    const token = await current.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadSitters = useCallback(
    async (overridePostal?: string) => {
      setSittersLoading(true);
      setSittersError(null);
      try {
        const activePostal = overridePostal !== undefined ? overridePostal : postalCode;
        const params = new URLSearchParams({
          radiusKm: String(radiusKm),
          maxRate: String(maxRate),
          ageGroup,
          vettedOnly: String(vettedOnly),
        });
        if (/^\d{6}$/.test(activePostal.trim())) {
          params.set('postalCode', activePostal.trim());
        }
        const res = await fetch(`/api/sitters?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setSittersError(data.error || 'Failed to load sitters.');
          return;
        }
        setSitters(data.sitters || []);
        setSearchLocation(data.searchLocation || null);
      } catch {
        setSittersError('Unable to reach KampungCare server.');
      } finally {
        setSittersLoading(false);
      }
    },
    [postalCode, radiusKm, maxRate, ageGroup, vettedOnly]
  );

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const loadUserContext = useCallback(async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      setOwnSitterProfile(null);
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile || null);
        setOwnSitterProfile(data.sitterProfile || null);
      }
    } catch {
      // Non-blocking
    }
  }, [getAuthHeaders]);

  const loadParentBookings = useCallback(async () => {
    if (!auth.currentUser) {
      setParentBookings([]);
      return;
    }
    setBookingsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/bookings/parent', { headers });
      if (res.ok) {
        const data = await res.json();
        setParentBookings(data.bookings || []);
      }
    } finally {
      setBookingsLoading(false);
    }
  }, [getAuthHeaders]);

  const loadSitterDashboard = useCallback(async () => {
    if (!auth.currentUser) return;
    setSitterLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/sitter/bookings', { headers });
      if (res.ok) {
        const data = await res.json();
        setOwnSitterProfile(data.sitterProfile || null);
        setSitterBookings(data.bookings || []);
      }
    } finally {
      setSitterLoading(false);
    }
  }, [getAuthHeaders]);

  const loadAdminQueue = useCallback(async () => {
    if (!auth.currentUser) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/sitters', { headers });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Admin access required.');
        return;
      }
      setAdminSitters(data.sitters || []);
      setAdminInquiries(data.inquiries || []);
    } catch {
      setAdminError('Could not load admin vetting queue.');
    } finally {
      setAdminLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        loadUserContext();
      } else {
        setUserProfile(null);
        setOwnSitterProfile(null);
        setParentBookings([]);
        setSitterBookings([]);
      }
    });
    return () => unsub();
  }, [loadUserContext]);

  useEffect(() => {
    loadSitters();
  }, [loadSitters]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!firebaseUser) return;
    if (activeTab === 'bookings') loadParentBookings();
    if (activeTab === 'sitter') loadSitterDashboard();
    if (activeTab === 'admin') loadAdminQueue();
  }, [
    activeTab,
    firebaseUser,
    loadParentBookings,
    loadSitterDashboard,
    loadAdminQueue,
  ]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await loadUserContext();
    } catch (err) {
      console.error('Sign in failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleCompleteSimulatedPayment = async (bookingId: number) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/checkout/confirm-simulated', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    if (res.ok) {
      await loadParentBookings();
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      await loadParentBookings();
    }
  };

  const handleToggleAvailability = async (nextVal: boolean) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/sitter/availability', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: nextVal }),
    });
    if (res.ok) {
      await loadSitterDashboard();
      await loadSitters();
    }
  };

  const handleApplySitter = async (payload: {
    displayName: string;
    headline: string;
    bio: string;
    neighborhood: string;
    postalCode: string;
    phoneE164: string;
    hourlyRateSgd: number;
    yearsExperience: number;
    ageGroups: string[];
    languages: string;
    certifications: string;
  }) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/sitter/apply', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Sitter application failed.');
    }
    await loadSitterDashboard();
  };

  const handleVetDecision = async (
    sitterId: number,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/sitters/${sitterId}/vet`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      await loadAdminQueue();
      await loadSitters();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C2422]">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        firebaseUser={firebaseUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        authLoading={authLoading}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {activeTab === 'find' && (
          <SitterFeed
            sitters={sitters}
            reviews={reviews}
            loading={sittersLoading}
            error={sittersError}
            postalCode={postalCode}
            onPostalCodeChange={setPostalCode}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            maxRate={maxRate}
            onMaxRateChange={setMaxRate}
            ageGroup={ageGroup}
            onAgeGroupChange={setAgeGroup}
            vettedOnly={vettedOnly}
            onVettedOnlyChange={setVettedOnly}
            searchLocation={searchLocation}
            onSearchSubmit={(p) => loadSitters(p)}
            onSelectSitter={(s) => setSelectedSitter(s)}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'bookings' && (
          <ParentBookings
            firebaseUser={firebaseUser}
            bookings={parentBookings}
            loading={bookingsLoading}
            onSignIn={handleSignIn}
            onCompleteSimulatedPayment={handleCompleteSimulatedPayment}
            onCancelBooking={handleCancelBooking}
            onBrowseSitters={() => setActiveTab('find')}
          />
        )}

        {activeTab === 'sitter' && (
          <SitterDashboard
            firebaseUser={firebaseUser}
            sitterProfile={ownSitterProfile}
            bookings={sitterBookings}
            loading={sitterLoading}
            onSignIn={handleSignIn}
            onToggleAvailability={handleToggleAvailability}
            onApplySitter={handleApplySitter}
          />
        )}

        {activeTab === 'admin' && (
          <AdminVettingQueue
            firebaseUser={firebaseUser}
            isAdmin={Boolean(userProfile?.isAdmin)}
            sitters={adminSitters}
            inquiries={adminInquiries}
            loading={adminLoading}
            error={adminError}
            onSignIn={handleSignIn}
            onVetDecision={handleVetDecision}
          />
        )}

        {activeTab === 'faq' && <FaqAndInquiry />}
      </main>

      <footer className="border-t border-[#E6E4DE] bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5E6764]">
          <p>
            KampungCare Singapore · PDPA-Compliant Home Childcare Marketplace · SGD Checkout
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('find')}
              className="hover:text-[#1C2422] cursor-pointer"
            >
              Find Sitters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sitter')}
              className="hover:text-[#1C2422] cursor-pointer"
            >
              Become a Sitter
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className="hover:text-[#1C2422] cursor-pointer"
            >
              FAQ & Inquiry
            </button>
          </div>
        </div>
      </footer>

      {selectedSitter && (
        <BookingModal
          sitter={selectedSitter}
          initialPostalCode={postalCode}
          firebaseUser={firebaseUser}
          userProfile={userProfile}
          getAuthHeaders={getAuthHeaders}
          onSignIn={handleSignIn}
          onClose={() => setSelectedSitter(null)}
          onBookingConfirmed={() => {
            loadParentBookings();
          }}
        />
      )}
    </div>
  );
}
