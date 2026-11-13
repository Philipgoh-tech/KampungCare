import { MapPin, Search, ShieldCheck, Star, SlidersHorizontal } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { HERO_IMAGE_URL, getSitterAvatarUrl } from '../lib/sitterImages.ts';
import { OneMapLocation, ReviewItem, SitterItem } from '../types/marketplace.ts';

interface SitterFeedProps {
  sitters: SitterItem[];
  reviews: ReviewItem[];
  loading: boolean;
  error: string | null;
  postalCode: string;
  onPostalCodeChange: (val: string) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  maxRate: number;
  onMaxRateChange: (rate: number) => void;
  ageGroup: string;
  onAgeGroupChange: (group: string) => void;
  vettedOnly: boolean;
  onVettedOnlyChange: (val: boolean) => void;
  searchLocation: OneMapLocation | null;
  onSearchSubmit: (postal?: string) => void;
  onSelectSitter: (sitter: SitterItem) => void;
  onNavigateTab: (tab: 'sitter' | 'faq') => void;
}

const AGE_GROUPS = [
  'ALL',
  'Infants (0-12m)',
  'Toddlers (1-3y)',
  'Preschool (4-6y)',
  'Primary (7-12y)',
];

const QUICK_POSTALS = [
  { code: '160055', label: 'Tiong Bahru' },
  { code: '270019', label: 'Holland V' },
  { code: '428774', label: 'Katong' },
  { code: '269012', label: 'Bukit Timah' },
];

export function SitterFeed({
  sitters,
  reviews,
  loading,
  error,
  postalCode,
  onPostalCodeChange,
  radiusKm,
  onRadiusChange,
  maxRate,
  onMaxRateChange,
  ageGroup,
  onAgeGroupChange,
  vettedOnly,
  onVettedOnlyChange,
  searchLocation,
  onSearchSubmit,
  onSelectSitter,
  onNavigateTab,
}: SitterFeedProps) {
  const [postalInputError, setPostalInputError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = postalCode.trim();
    if (cleaned && !/^\d{6}$/.test(cleaned)) {
      setPostalInputError('Please enter a valid 6-digit Singapore postal code.');
      return;
    }
    setPostalInputError(null);
    onSearchSubmit(cleaned);
  };

  const handleQuickPostal = (code: string) => {
    setPostalInputError(null);
    onPostalCodeChange(code);
    onSearchSubmit(code);
  };

  return (
    <div className="space-y-12">
      {/* Hero Split: Balanced 2-column stretch */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch pt-4">
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-[#E6E4DE] rounded-2xl p-6 sm:p-8 lg:p-10">
          <div className="space-y-5">
            <p className="text-xs font-medium tracking-wide text-[#14453D]">
              Singapore Home Babysitting · PDPA-First Privacy
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] leading-[1.15] font-semibold text-[#1C2422] text-balance">
              Trusted, Founder-vetted babysitters near your Singapore postcode.
            </h1>
            <p className="text-base text-[#5E6764] leading-relaxed max-w-xl">
              Search verified caregivers by 6-digit postal code, book a minimum 3-hour window in SGD via PayNow or card, and unlock direct WhatsApp coordination once confirmed.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-[#5E6764] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={postalCode}
                  onChange={(e) => {
                    setPostalInputError(null);
                    onPostalCodeChange(e.target.value.replace(/[^\d]/g, '').slice(0, 6));
                  }}
                  placeholder="Enter 6-digit SG postal code (e.g. 160055)"
                  aria-label="Singapore 6-digit postal code"
                  className="w-full h-12 pl-10 pr-4 bg-[#FAF9F6] border border-[#D9D6CE] rounded-xl text-sm font-mono-tabular text-[#1C2422] placeholder:font-sans placeholder:text-[#7A837F] focus:outline-none focus:border-[#14453D] focus:ring-2 focus:ring-[#14453D]/15"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 inline-flex items-center justify-center gap-2 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                Find Nearby Sitters
              </button>
            </form>

            {postalInputError && (
              <p className="text-xs font-medium text-[#B91C1C]" role="alert">
                {postalInputError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5E6764]">
              <span>Try neighborhoods:</span>
              {QUICK_POSTALS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleQuickPostal(item.code)}
                  className="px-2.5 py-1 rounded-md border border-[#E6E4DE] bg-[#FAF9F6] hover:border-[#14453D] hover:text-[#14453D] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span className="font-mono-tabular">{item.code}</span> · {item.label}
                </button>
              ))}
            </div>

            {searchLocation && (
              <div className="pt-2 border-t border-[#E6E4DE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#1C2422]">
                <span>
                  Matched via OneMap:{' '}
                  <strong className="font-semibold">{searchLocation.buildingName}</strong> ·{' '}
                  {searchLocation.streetAddress} ({searchLocation.neighborhood})
                </span>
                <span className="font-mono-tabular text-[#5E6764]">
                  Postal {searchLocation.postalCode}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#E6E4DE] bg-[#EAE7DF] min-h-[280px]">
          <img
            src={HERO_IMAGE_URL}
            alt="Singapore caregiver reading an illustrated book with a young child in a sunlit living room"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover lg:absolute lg:inset-0"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
            <p className="text-xs font-medium text-white/85">
              Personal Founder Interviews · First-Aid Verified
            </p>
            <p className="text-sm font-medium mt-1">
              Caregivers across Tiong Bahru, Holland Village, Bukit Timah, Katong & Tampines.
            </p>
          </div>
        </div>
      </section>

      {/* Full-width 4-column summary strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-[#E6E4DE] rounded-2xl p-5 sm:p-6">
        <div>
          <p className="text-xs text-[#5E6764]">Minimum Booking Block</p>
          <p className="mt-1 text-lg font-semibold text-[#1C2422] tabular-nums">3 Hours</p>
        </div>
        <div>
          <p className="text-xs text-[#5E6764]">Vetted Hourly Rates</p>
          <p className="mt-1 text-lg font-semibold text-[#1C2422] tabular-nums">
            S$18 – S$28 / hr
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5E6764]">Local Checkout</p>
          <p className="mt-1 text-lg font-semibold text-[#1C2422]">Stripe SGD · PayNow</p>
        </div>
        <div>
          <p className="text-xs text-[#5E6764]">Contact Privacy Gate</p>
          <p className="mt-1 text-lg font-semibold text-[#1C2422]">WhatsApp on Confirm</p>
        </div>
      </section>

      {/* Filters + Sitter Feed */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E6E4DE]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
              Available Babysitters
            </h2>
            <p className="text-sm text-[#5E6764] mt-0.5">
              {loading
                ? 'Searching verified caregivers...'
                : `${sitters.length} caregiver${sitters.length === 1 ? '' : 's'} matching your filters`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#5E6764]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Radius:</span>
              <div className="flex items-center gap-1 p-1 bg-[#F0EEE8] rounded-lg">
                {[5, 10, 15, 40].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => onRadiusChange(km)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      radiusKm === km
                        ? 'bg-white text-[#1C2422] shadow-sm'
                        : 'text-[#5E6764] hover:text-[#1C2422]'
                    }`}
                  >
                    {km === 40 ? 'Islandwide' : `${km} km`}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#5E6764]">
              <span>Max rate:</span>
              <input
                type="range"
                min={20}
                max={35}
                step={1}
                value={maxRate}
                onChange={(e) => onMaxRateChange(Number(e.target.value))}
                className="w-24 accent-[#14453D]"
              />
              <span className="font-mono-tabular font-semibold text-[#1C2422]">
                S${maxRate}/hr
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#1C2422] cursor-pointer">
              <input
                type="checkbox"
                checked={vettedOnly}
                onChange={(e) => onVettedOnlyChange(e.target.checked)}
                className="w-4 h-4 rounded accent-[#14453D]"
              />
              <span>Founder Vetted Only</span>
            </label>
          </div>
        </div>

        {/* Interactive Age Group Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {AGE_GROUPS.map((group) => {
            const active = ageGroup === group;
            return (
              <button
                key={group}
                type="button"
                onClick={() => onAgeGroupChange(group)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#14453D] border-[#14453D] text-white'
                    : 'bg-white border-[#E6E4DE] text-[#5E6764] hover:text-[#1C2422] hover:border-[#C9C5BC]'
                }`}
              >
                {group === 'ALL' ? 'All Age Groups' : group}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl border border-[#E6E4DE] bg-white animate-pulse p-6"
              />
            ))}
          </div>
        ) : sitters.length === 0 ? (
          <div className="bg-white border border-[#E6E4DE] rounded-2xl p-10 text-center space-y-3">
            <p className="font-display text-xl font-semibold text-[#1C2422]">
              No sitters found within {radiusKm} km at S${maxRate}/hr
            </p>
            <p className="text-sm text-[#5E6764] max-w-md mx-auto">
              Try widening your search radius to Islandwide, raising your hourly rate filter, or sending a care concierge inquiry.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onRadiusChange(40);
                  onMaxRateChange(35);
                  onAgeGroupChange('ALL');
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#14453D] text-white rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('faq')}
                className="px-4 py-2 text-xs font-medium border border-[#D9D6CE] text-[#1C2422] rounded-lg cursor-pointer"
              >
                Send Care Inquiry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sitters.map((sitter) => (
              <article
                key={sitter.id}
                className="bg-white border border-[#E6E4DE] rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-[#C5C1B6] transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#EAE7DF] shrink-0 border border-[#E6E4DE]">
                      <img
                        src={getSitterAvatarUrl(sitter.avatarKey)}
                        alt={sitter.displayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-[#1C2422] truncate">
                          {sitter.displayName}
                        </h3>
                        <p className="font-mono-tabular text-base font-semibold text-[#14453D] whitespace-nowrap shrink-0">
                          S${sitter.hourlyRateSgd}
                          <span className="text-xs font-normal text-[#5E6764]">/hr</span>
                        </p>
                      </div>

                      {/* Clean unboxed metadata with typographic separators (no pills) */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5E6764]">
                        <span>{sitter.neighborhood}</span>
                        {typeof sitter.distanceKm === 'number' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular text-[#1C2422]">
                              {sitter.distanceKm} km away
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{sitter.yearsExperience} yrs exp</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-[#1C2422] font-medium tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                          {sitter.ratingAvg.toFixed(2)} ({sitter.reviewCount})
                        </span>
                      </div>

                      {sitter.isVetted && (
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14453D] pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Founder Vetted · District {sitter.postalDistrict}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#1C2422]">{sitter.headline}</p>
                    <p className="text-sm text-[#5E6764] leading-relaxed">{sitter.bio}</p>
                  </div>

                  {/* Unboxed credentials summary */}
                  <div className="pt-3 border-t border-[#F0EEE8] text-xs text-[#5E6764] space-y-1">
                    <p>
                      <span className="text-[#1C2422] font-medium">Ages:</span>{' '}
                      {sitter.ageGroups.join(' · ')}
                    </p>
                    <p>
                      <span className="text-[#1C2422] font-medium">Languages & Certs:</span>{' '}
                      {sitter.languages} · {sitter.certifications}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-[#5E6764]">
                    WhatsApp unlocks on confirmation
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectSitter(sitter)}
                    className="px-5 py-2.5 bg-[#14453D] text-white text-xs font-semibold rounded-xl hover:bg-[#0F362F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Book {sitter.displayName.split(' ')[0]}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Adjacent Parent Reviews */}
      <section className="space-y-5 pt-4 border-t border-[#E6E4DE]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
              Recent Singapore Parent Reviews
            </h2>
            <p className="text-sm text-[#5E6764]">
              Verified post-session feedback from families across central and heartland estates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('sitter')}
            className="text-xs font-semibold text-[#14453D] hover:underline self-start sm:self-auto cursor-pointer"
          >
            Apply to become a vetted sitter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#E6E4DE] rounded-2xl p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs text-[#5E6764]">
                <span className="font-semibold text-[#1C2422]">
                  {rev.parentName} · {rev.neighborhood}
                </span>
                <span className="inline-flex items-center gap-1 text-[#1C2422] font-medium">
                  <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                  {rev.rating}.0 for {rev.sitterName}
                </span>
              </div>
              <p className="text-sm text-[#5E6764] leading-relaxed">“{rev.comment}”</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
