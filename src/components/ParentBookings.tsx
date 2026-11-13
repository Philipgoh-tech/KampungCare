import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Lock,
  MessageCircle,
  XCircle,
} from 'lucide-react';
import { formatSgd } from '../lib/validation.ts';
import { ParentBooking } from '../types/marketplace.ts';

interface ParentBookingsProps {
  firebaseUser: User | null;
  bookings: ParentBooking[];
  loading: boolean;
  onSignIn: () => void;
  onCompleteSimulatedPayment: (bookingId: number) => Promise<void>;
  onCancelBooking: (bookingId: number) => Promise<void>;
  onBrowseSitters: () => void;
}

export function ParentBookings({
  firebaseUser,
  bookings,
  loading,
  onSignIn,
  onCompleteSimulatedPayment,
  onCancelBooking,
  onBrowseSitters,
}: ParentBookingsProps) {
  if (!firebaseUser) {
    return (
      <section className="bg-white border border-[#E6E4DE] rounded-2xl p-10 text-center space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
          Your Babysitting Bookings
        </h2>
        <p className="text-sm text-[#5E6764] max-w-md mx-auto">
          Sign in with your Google account to view upcoming sessions, complete pending PayNow checkouts, and unlock direct WhatsApp coordination.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="px-5 py-2.5 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] cursor-pointer"
        >
          Sign In with Google
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#E6E4DE]">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1C2422]">
            My Bookings
          </h1>
          <p className="text-sm text-[#5E6764] mt-1">
            Contact numbers and WhatsApp coordination links unlock automatically once SGD payment reaches CONFIRMED status.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowseSitters}
          className="px-4 py-2 text-xs font-semibold bg-[#14453D] text-white rounded-lg self-start sm:self-auto cursor-pointer"
        >
          Book Another Sitter
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border border-[#E6E4DE] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-[#E6E4DE] rounded-2xl p-10 text-center space-y-3">
          <p className="font-display text-xl font-semibold text-[#1C2422]">
            No bookings yet
          </p>
          <p className="text-sm text-[#5E6764]">
            Search vetted caregivers by your 6-digit Singapore postal code to schedule your first session.
          </p>
          <button
            type="button"
            onClick={onBrowseSitters}
            className="px-5 py-2.5 bg-[#14453D] text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Browse Sitters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED';
            const isPending = b.status === 'PENDING_PAYMENT';
            return (
              <div
                key={b.id}
                className="bg-white border border-[#E6E4DE] rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono-tabular font-semibold text-[#1C2422]">
                      {b.bookingCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0F766E]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmed & Paid
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                        <Clock className="w-3.5 h-3.5" />
                        Pending SGD Payment
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#B91C1C]">
                        <XCircle className="w-3.5 h-3.5" />
                        {b.status}
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="text-[#5E6764] uppercase">{b.paymentMethod}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-[#1C2422]">
                    {b.sitterName} · {b.sitterNeighborhood}
                  </h3>

                  <p className="text-sm text-[#5E6764] tabular-nums">
                    {b.serviceDate} · {b.startTime}–{b.endTime} ({b.durationHours}h) ·{' '}
                    {b.numChildren} child{b.numChildren > 1 ? 'ren' : ''} ({b.childrenAges})
                  </p>

                  <p className="text-xs text-[#5E6764]">
                    {b.buildingName} · {b.streetAddress} (Postal {b.postalCode})
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-[#5E6764]">Total Paid / Due</p>
                    <p className="text-xl font-mono-tabular font-semibold text-[#1C2422]">
                      {formatSgd(b.totalSgdCents)}
                    </p>
                  </div>

                  {isConfirmed && b.whatsappCoordinationUrl ? (
                    <div className="flex flex-col items-start lg:items-end gap-1.5">
                      <a
                        href={b.whatsappCoordinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#14453D] text-white text-xs font-semibold rounded-xl hover:bg-[#0F362F] transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Coordinate on WhatsApp
                      </a>
                      {b.counterpartMaskedPhone && (
                        <span className="text-[11px] font-mono-tabular text-[#5E6764]">
                          Sitter contact: {b.counterpartMaskedPhone}
                        </span>
                      )}
                    </div>
                  ) : isPending ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCompleteSimulatedPayment(b.id)}
                        className="px-4 py-2 bg-[#14453D] text-white text-xs font-semibold rounded-xl hover:bg-[#0F362F] cursor-pointer whitespace-nowrap"
                      >
                        Verify PayNow / Card Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelBooking(b.id)}
                        className="px-3 py-2 border border-[#D9D6CE] text-xs font-medium text-[#5E6764] hover:text-[#B91C1C] rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#5E6764]">
                      <Lock className="w-3.5 h-3.5" />
                      WhatsApp locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
