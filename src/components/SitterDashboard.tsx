import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Lock,
  MessageCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { formatSgd } from '../lib/validation.ts';
import { SitterBookingItem, SitterItem } from '../types/marketplace.ts';

interface SitterDashboardProps {
  firebaseUser: User | null;
  sitterProfile: SitterItem | null;
  bookings: SitterBookingItem[];
  loading: boolean;
  onSignIn: () => void;
  onToggleAvailability: (nextVal: boolean) => Promise<void>;
  onApplySitter: (payload: {
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
  }) => Promise<void>;
}

const AGE_GROUP_OPTIONS = [
  'Infants (0-12m)',
  'Toddlers (1-3y)',
  'Preschool (4-6y)',
  'Primary (7-12y)',
];

export function SitterDashboard({
  firebaseUser,
  sitterProfile,
  bookings,
  loading,
  onSignIn,
  onToggleAvailability,
  onApplySitter,
}: SitterDashboardProps) {
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [neighborhood, setNeighborhood] = useState('Tiong Bahru');
  const [postalCode, setPostalCode] = useState('160055');
  const [phoneE164, setPhoneE164] = useState('+6591234567');
  const [hourlyRateSgd, setHourlyRateSgd] = useState(24);
  const [yearsExperience, setYearsExperience] = useState(4);
  const [ageGroups, setAgeGroups] = useState<string[]>([
    'Toddlers (1-3y)',
    'Preschool (4-6y)',
  ]);
  const [languages, setLanguages] = useState('English, Mandarin');
  const [certifications, setCertifications] = useState('Child First Aid Certified');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  if (!firebaseUser) {
    return (
      <section className="bg-white border border-[#E6E4DE] rounded-2xl p-10 text-center space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
          Sitter Dashboard & Caregiver Onboarding
        </h2>
        <p className="text-sm text-[#5E6764] max-w-md mx-auto">
          Sign in with Google to toggle your availability, manage confirmed parent bookings, or apply to become a Founder-vetted Singapore babysitter.
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

  const toggleAgeGroup = (group: string) => {
    setAgeGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const handleSubmitApplication = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittedNotice(null);

    if (ageGroups.length === 0) {
      setError('Select at least one child age group.');
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setError('Enter a valid 6-digit Singapore postal code.');
      return;
    }
    if (!/^\+65[689]\d{7}$/.test(phoneE164.trim())) {
      setError('Enter a valid Singapore mobile number (+658xxxxxxx or +659xxxxxxx).');
      return;
    }

    setSubmitting(true);
    try {
      await onApplySitter({
        displayName: displayName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        neighborhood: neighborhood.trim(),
        postalCode: postalCode.trim(),
        phoneE164: phoneE164.trim(),
        hourlyRateSgd,
        yearsExperience,
        ageGroups,
        languages: languages.trim(),
        certifications: certifications.trim(),
      });
      setSubmittedNotice(
        'Your sitter profile has been submitted to the Founder Vetting Queue for review.'
      );
    } catch (err) {
      setError((err as Error).message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="pb-4 border-b border-[#E6E4DE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1C2422]">
            Sitter Portal
          </h1>
          <p className="text-sm text-[#5E6764] mt-1">
            Manage availability, view confirmed bookings, and coordinate with parents via one-tap WhatsApp.
          </p>
        </div>

        {sitterProfile && (
          <div className="flex items-center gap-3 bg-white border border-[#E6E4DE] rounded-xl px-4 py-2.5">
            <span className="text-xs font-medium text-[#1C2422]">
              Accepting Bookings:
            </span>
            <button
              type="button"
              onClick={() => onToggleAvailability(!sitterProfile.isAvailable)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                sitterProfile.isAvailable
                  ? 'bg-[#14453D] text-white'
                  : 'bg-[#F0EEE8] text-[#5E6764]'
              }`}
            >
              {sitterProfile.isAvailable ? 'Available' : 'Paused'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-48 rounded-2xl bg-white border border-[#E6E4DE] animate-pulse" />
      ) : sitterProfile ? (
        <div className="space-y-8">
          {/* Status Overview */}
          <div className="bg-white border border-[#E6E4DE] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {sitterProfile.isVetted && sitterProfile.vettingStatus === 'APPROVED' ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F766E]">
                    <ShieldCheck className="w-4 h-4" />
                    Approved · Founder Vetted
                  </span>
                ) : sitterProfile.vettingStatus === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#B91C1C]">
                    <XCircle className="w-4 h-4" />
                    Application Not Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#B45309]">
                    <Clock className="w-4 h-4" />
                    Pending Founder Vetting Review
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="text-[#5E6764]">{sitterProfile.neighborhood}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular font-semibold text-[#1C2422]">
                  S${sitterProfile.hourlyRateSgd}/hr
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#1C2422]">
                {sitterProfile.displayName}
              </h2>
              <p className="text-sm text-[#5E6764]">{sitterProfile.headline}</p>
            </div>
          </div>

          {/* Assigned Bookings */}
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
              Your Assigned Bookings
            </h2>

            {bookings.length === 0 ? (
              <div className="bg-white border border-[#E6E4DE] rounded-2xl p-8 text-center space-y-2">
                <p className="text-base font-semibold text-[#1C2422]">
                  No confirmed sessions yet
                </p>
                <p className="text-sm text-[#5E6764]">
                  Once a parent completes SGD PayNow or card checkout with you, the confirmed session and one-tap WhatsApp parent button will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => {
                  const isConfirmed =
                    b.status === 'CONFIRMED' || b.status === 'COMPLETED';
                  return (
                    <div
                      key={b.id}
                      className="bg-white border border-[#E6E4DE] rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono-tabular font-semibold text-[#1C2422]">
                            {b.bookingCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold inline-flex items-center gap-1 ${
                              isConfirmed ? 'text-[#0F766E]' : 'text-[#B45309]'
                            }`}
                          >
                            {isConfirmed ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {b.status}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-[#1C2422]">
                          Parent: {b.parentName} · {b.buildingName} (Postal {b.postalCode})
                        </h3>
                        <p className="text-sm text-[#5E6764] tabular-nums">
                          {b.serviceDate} · {b.startTime}–{b.endTime} ({b.durationHours}h) ·{' '}
                          {b.numChildren} child{b.numChildren > 1 ? 'ren' : ''} ({b.childrenAges})
                        </p>
                        {b.emergencyNotes && (
                          <p className="text-xs text-[#5E6764]">
                            Notes: {b.emergencyNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                        <div className="lg:text-right">
                          <p className="text-xs text-[#5E6764]">Your Payout (85%)</p>
                          <p className="text-lg font-mono-tabular font-semibold text-[#14453D]">
                            {formatSgd(b.sitterPayoutSgdCents)}
                          </p>
                        </div>
                        {isConfirmed && b.whatsappParentUrl ? (
                          <a
                            href={b.whatsappParentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#14453D] text-white text-xs font-semibold rounded-xl hover:bg-[#0F362F] whitespace-nowrap"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp Parent
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#5E6764]">
                            <Lock className="w-3.5 h-3.5" />
                            Awaiting parent payment
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E6E4DE] rounded-2xl p-6 sm:p-8 max-w-3xl space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
              Apply as a Singapore Babysitter
            </h2>
            <p className="text-sm text-[#5E6764]">
              PDPA Data Minimization: We never collect NRIC numbers or full residential unit numbers online. Your profile enters the Founder Vetting Queue for manual verification.
            </p>
          </div>

          {submittedNotice && (
            <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-medium text-[#0F766E]">
              {submittedNotice}
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">Full Display Name</span>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jasmine Ng"
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">
                  WhatsApp Mobile (+65)
                </span>
                <input
                  type="tel"
                  required
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  placeholder="+6591234567"
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">Neighborhood / Estate</span>
                <input
                  type="text"
                  required
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g. Tiong Bahru"
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">
                  6-Digit Postal Code
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
                  Hourly Rate (SGD S$18–S$35)
                </span>
                <input
                  type="number"
                  required
                  min={18}
                  max={35}
                  value={hourlyRateSgd}
                  onChange={(e) => setHourlyRateSgd(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#1C2422]">Headline</span>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Former ECDA Educator · Infant & Toddler Evening Care"
                className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#1C2422]">
                Childcare Background & Bio
              </span>
              <textarea
                rows={3}
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your preschool, nursing, or family childcare experience..."
                className="w-full p-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-medium text-[#1C2422]">
                Age Groups Supported
              </span>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUP_OPTIONS.map((g) => {
                  const selected = ageGroups.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleAgeGroup(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                        selected
                          ? 'bg-[#14453D] border-[#14453D] text-white'
                          : 'bg-white border-[#D9D6CE] text-[#5E6764]'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">Years Experience</span>
                <input
                  type="number"
                  required
                  min={1}
                  max={40}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm font-mono-tabular"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">Languages</span>
                <input
                  type="text"
                  required
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#1C2422]">Certifications</span>
                <input
                  type="text"
                  required
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm"
                />
              </label>
            </div>

            {error && (
              <p className="text-xs font-medium text-[#B91C1C]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit for Founder Vetting'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
