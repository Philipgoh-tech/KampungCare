import { User } from 'firebase/auth';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  MessageCircle,
  QrCode,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import {
  calculateSgdPricing,
  computeHoursBetween,
  formatSgd,
} from '../lib/validation.ts';
import {
  OneMapLocation,
  ParentBooking,
  SitterItem,
  UserProfile,
} from '../types/marketplace.ts';

interface BookingModalProps {
  sitter: SitterItem | null;
  initialPostalCode: string;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onSignIn: () => Promise<void>;
  onClose: () => void;
  onBookingConfirmed: (booking: ParentBooking) => void;
}

export function BookingModal({
  sitter,
  initialPostalCode,
  firebaseUser,
  userProfile,
  getAuthHeaders,
  onSignIn,
  onClose,
  onBookingConfirmed,
}: BookingModalProps) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [serviceDate, setServiceDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('22:00');
  const [numChildren, setNumChildren] = useState(1);
  const [childrenAges, setChildrenAges] = useState('Toddler (2 yrs)');
  const [postalCode, setPostalCode] = useState(initialPostalCode || '160055');
  const [parentPhone, setParentPhone] = useState(userProfile?.phoneE164 || '+6591234567');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'card'>('paynow');
  const [resolvedAddress, setResolvedAddress] = useState<OneMapLocation | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<ParentBooking | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ParentBooking | null>(null);

  useEffect(() => {
    if (userProfile?.phoneE164) setParentPhone(userProfile.phoneE164);
    if (initialPostalCode && /^\d{6}$/.test(initialPostalCode)) {
      setPostalCode(initialPostalCode);
    }
  }, [userProfile, initialPostalCode]);

  useEffect(() => {
    if (!/^\d{6}$/.test(postalCode)) {
      setResolvedAddress(null);
      return;
    }
    let active = true;
    fetch(`/api/onemap/lookup?postalCode=${encodeURIComponent(postalCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setResolvedAddress(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [postalCode]);

  if (!sitter) return null;

  const durationHours = computeHoursBetween(startTime, endTime);
  const pricing = calculateSgdPricing(
    sitter.hourlyRateSgd,
    Math.max(durationHours, 0),
    numChildren
  );

  const handleCreateCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firebaseUser) {
      await onSignIn();
      return;
    }

    if (durationHours < 3) {
      setError('Minimum booking block is 3 hours per Singapore care guidelines.');
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setError('Enter a valid 6-digit Singapore postal code.');
      return;
    }
    if (!/^\+65[689]\d{7}$/.test(parentPhone.trim())) {
      setError('Enter a valid Singapore mobile number (+658xxxxxxx or +659xxxxxxx).');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sitterProfileId: sitter.id,
          serviceDate,
          startTime,
          endTime,
          numChildren,
          childrenAges,
          postalCode: postalCode.trim(),
          parentPhone: parentPhone.trim(),
          emergencyNotes,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not initiate checkout.');
        return;
      }

      if (data.mode === 'stripe_live' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setPendingBooking(data.booking);
    } catch {
      setError('Network error while creating checkout session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSandboxPayment = async () => {
    if (!pendingBooking) return;
    setSubmitting(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/checkout/confirm-simulated', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: pendingBooking.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Payment verification failed.');
        return;
      }

      setConfirmedBooking(data.booking);
      onBookingConfirmed(data.booking);
    } catch {
      setError('Unable to verify payment right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="bg-white border border-[#E6E4DE] rounded-2xl w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6E4DE] flex items-center justify-between gap-4">
          <div>
            <h2 id="booking-modal-title" className="font-display text-xl font-semibold text-[#1C2422]">
              {confirmedBooking
                ? 'Booking Confirmed'
                : pendingBooking
                ? 'Complete SGD Payment'
                : `Book ${sitter.displayName}`}
            </h2>
            <p className="text-xs text-[#5E6764]">
              {sitter.neighborhood} · S${sitter.hourlyRateSgd}/hr · Founder Vetted
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="w-9 h-9 rounded-lg border border-[#E6E4DE] flex items-center justify-center text-[#5E6764] hover:text-[#1C2422] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto">
          {confirmedBooking ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#0F766E]">
                    Payment Verified ({formatSgd(confirmedBooking.totalSgdCents)} SGD)
                  </p>
                  <p className="text-xs text-[#1C2422]">
                    Booking <span className="font-mono-tabular font-semibold">{confirmedBooking.bookingCode}</span> is now{' '}
                    <strong>CONFIRMED</strong>. Direct WhatsApp coordination is unlocked below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border border-[#E6E4DE] rounded-xl p-4">
                <div>
                  <p className="text-xs text-[#5E6764]">Date & Window</p>
                  <p className="font-medium text-[#1C2422] tabular-nums">
                    {confirmedBooking.serviceDate} · {confirmedBooking.startTime}–{confirmedBooking.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5E6764]">Location (OneMap Verified)</p>
                  <p className="font-medium text-[#1C2422]">
                    {confirmedBooking.buildingName} ({confirmedBooking.postalCode})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5E6764]">Sitter Direct Contact</p>
                  <p className="font-mono-tabular font-medium text-[#1C2422]">
                    {confirmedBooking.counterpartMaskedPhone || 'Unlocked via WhatsApp'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5E6764]">Payment Method</p>
                  <p className="font-medium text-[#1C2422] uppercase">
                    {confirmedBooking.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {confirmedBooking.whatsappCoordinationUrl && (
                  <a
                    href={confirmedBooking.whatsappCoordinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 px-5 inline-flex items-center justify-center gap-2 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Coordinate on WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 border border-[#D9D6CE] text-sm font-medium text-[#1C2422] rounded-xl hover:bg-[#FAF9F6] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : pendingBooking ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
                <Lock className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <div className="text-xs text-[#92400E] space-y-1">
                  <p className="font-semibold">
                    Status: PENDING_PAYMENT · Privacy Gate Active
                  </p>
                  <p>
                    Phone numbers and WhatsApp coordination links remain hidden until SGD payment clears.
                  </p>
                </div>
              </div>

              <div className="border border-[#E6E4DE] rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-36 h-36 rounded-xl bg-[#FAF9F6] border border-[#E6E4DE] flex flex-col items-center justify-center p-3 shrink-0 text-center">
                  {paymentMethod === 'paynow' ? (
                    <>
                      <QrCode className="w-16 h-16 text-[#14453D]" />
                      <span className="mt-2 text-[11px] font-mono-tabular text-[#5E6764]">
                        PayNow SGD QR
                      </span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-16 h-16 text-[#14453D]" />
                      <span className="mt-2 text-[11px] font-mono-tabular text-[#5E6764]">
                        Stripe Card SGD
                      </span>
                    </>
                  )}
                </div>

                <div className="space-y-2 text-sm flex-1">
                  <p className="text-xs text-[#5E6764]">
                    Booking Ref <span className="font-mono-tabular font-semibold text-[#1C2422]">{pendingBooking.bookingCode}</span>
                  </p>
                  <p className="text-2xl font-mono-tabular font-semibold text-[#1C2422]">
                    {formatSgd(pendingBooking.totalSgdCents)}
                  </p>
                  <p className="text-xs text-[#5E6764]">
                    Includes {formatSgd(pendingBooking.sitterPayoutSgdCents)} sitter payout and{' '}
                    {formatSgd(pendingBooking.platformFeeSgdCents)} platform vetting & insurance fee.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-[#B91C1C]" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleConfirmSandboxPayment}
                  disabled={submitting}
                  className="flex-1 h-11 px-5 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Verifying SGD Payment...'
                    : `Complete ${paymentMethod === 'paynow' ? 'PayNow' : 'Card'} Payment (${formatSgd(
                        pendingBooking.totalSgdCents
                      )})`}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBooking(null)}
                  className="h-11 px-4 border border-[#D9D6CE] text-sm font-medium text-[#1C2422] rounded-xl cursor-pointer"
                >
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateCheckout} className="space-y-5">
              {!firebaseUser && (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E6E4DE] flex items-center justify-between gap-4">
                  <p className="text-xs text-[#5E6764]">
                    Sign in with Google to confirm your parent profile and save your booking.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSignIn()}
                    className="px-3.5 py-2 bg-[#14453D] text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">Service Date</span>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">Start Time</span>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">
                    End Time (min 3h)
                  </span>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">Number of Children</span>
                  <select
                    value={numChildren}
                    onChange={(e) => setNumChildren(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                  >
                    <option value={1}>1 Child (Base rate)</option>
                    <option value={2}>2 Children (+S$3/hr)</option>
                    <option value={3}>3 Children (+S$6/hr)</option>
                    <option value={4}>4 Children (+S$9/hr)</option>
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">Children Ages</span>
                  <input
                    type="text"
                    required
                    value={childrenAges}
                    onChange={(e) => setChildrenAges(e.target.value)}
                    placeholder="e.g. 18 months & 5 years"
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">
                    Singapore 6-Digit Postal Code
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) =>
                      setPostalCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))
                    }
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#1C2422]">
                    WhatsApp Mobile (+65)
                  </span>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+6591234567"
                    className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                  />
                </label>
              </div>

              {resolvedAddress && (
                <p className="text-xs text-[#5E6764] bg-[#FAF9F6] px-3 py-2 rounded-lg border border-[#E6E4DE]">
                  OneMap Verified: <strong className="text-[#1C2422]">{resolvedAddress.buildingName}</strong> ·{' '}
                  {resolvedAddress.streetAddress}. For PDPA safety, share your unit number only via WhatsApp after confirmation.
                </p>
              )}

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">
                  Allergies, Bedtime Routine & Emergency Notes
                </span>
                <textarea
                  rows={2}
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  placeholder="Optional allergies, bedtime routine, or emergency contact instructions..."
                  className="w-full p-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                />
              </label>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#1C2422]">
                  Stripe SGD Payment Method
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paynow')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      paymentMethod === 'paynow'
                        ? 'border-[#14453D] bg-[#14453D]/5 text-[#14453D]'
                        : 'border-[#E6E4DE] bg-white text-[#5E6764]'
                    }`}
                  >
                    <p className="text-xs font-semibold">PayNow QR (SGD)</p>
                    <p className="text-[11px] mt-0.5">Instant Singapore bank transfer</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-[#14453D] bg-[#14453D]/5 text-[#14453D]'
                        : 'border-[#E6E4DE] bg-white text-[#5E6764]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Credit / Debit Card</p>
                    <p className="text-[11px] mt-0.5">Visa, Mastercard, Amex in SGD</p>
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-[#FAF9F6] border border-[#E6E4DE] rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#5E6764]">
                  <span>
                    Duration ({durationHours} hrs × S${pricing.effectiveHourlyRateSgd}/hr)
                  </span>
                  <span className="font-mono-tabular text-[#1C2422]">
                    {formatSgd(pricing.subtotalSgdCents)}
                  </span>
                </div>
                <div className="flex justify-between text-[#5E6764]">
                  <span>Direct Sitter Payout (85%)</span>
                  <span className="font-mono-tabular text-[#1C2422]">
                    {formatSgd(pricing.sitterPayoutSgdCents)}
                  </span>
                </div>
                <div className="flex justify-between text-[#5E6764]">
                  <span>Platform Vetting & Coordination Fee (15%)</span>
                  <span className="font-mono-tabular text-[#1C2422]">
                    {formatSgd(pricing.platformFeeSgdCents)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E6E4DE] flex justify-between text-sm font-semibold text-[#1C2422]">
                  <span>Total Due (SGD)</span>
                  <span className="font-mono-tabular text-[#14453D]">
                    {formatSgd(pricing.totalSgdCents)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-[#B91C1C]" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || durationHours < 3}
                className="w-full h-11 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {!firebaseUser
                  ? 'Sign In with Google to Continue'
                  : submitting
                  ? 'Creating Checkout Session...'
                  : `Proceed to SGD Checkout (${formatSgd(pricing.totalSgdCents)})`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
