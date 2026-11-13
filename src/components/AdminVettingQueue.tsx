import { User } from 'firebase/auth';
import { Check, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { AdminSitterRow, InquiryRow } from '../types/marketplace.ts';

interface AdminVettingQueueProps {
  firebaseUser: User | null;
  isAdmin: boolean;
  sitters: AdminSitterRow[];
  inquiries: InquiryRow[];
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
  onVetDecision: (sitterId: number, decision: 'APPROVED' | 'REJECTED') => Promise<void>;
}

export function AdminVettingQueue({
  firebaseUser,
  isAdmin,
  sitters,
  inquiries,
  loading,
  error,
  onSignIn,
  onVetDecision,
}: AdminVettingQueueProps) {
  if (!firebaseUser) {
    return (
      <section className="bg-white border border-[#E6E4DE] rounded-2xl p-10 text-center space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
          Admin Vetting Queue
        </h2>
        <p className="text-sm text-[#5E6764] max-w-md mx-auto">
          Protected founder review console. Sign in with an authorized admin Google account to approve or reject caregiver applications.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="px-5 py-2.5 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] cursor-pointer"
        >
          Sign In as Admin
        </button>
      </section>
    );
  }

  if (!isAdmin && error) {
    return (
      <section className="bg-white border border-[#E6E4DE] rounded-2xl p-10 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-[#B45309] mx-auto" />
        <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
          Restricted Founder Console
        </h2>
        <p className="text-sm text-[#5E6764] max-w-md mx-auto">{error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="pb-4 border-b border-[#E6E4DE]">
        <h1 className="font-display text-3xl font-semibold text-[#1C2422]">
          Admin Vetting Queue
        </h1>
        <p className="text-sm text-[#5E6764] mt-1">
          PDPA-compliant review: displays only neighborhood, 2-digit postal sector, certifications, and masked vetting status.
        </p>
      </div>

      {loading ? (
        <div className="h-56 rounded-2xl bg-white border border-[#E6E4DE] animate-pulse" />
      ) : (
        <div className="space-y-8">
          <div className="bg-white border border-[#E6E4DE] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E6E4DE] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1C2422]">
                Caregiver Profiles ({sitters.length})
              </h2>
              <span className="text-xs text-[#5E6764] tabular-nums">
                {sitters.filter((s) => s.vettingStatus === 'PENDING').length} pending review
              </span>
            </div>

            <div className="divide-y divide-[#E6E4DE]">
              {sitters.map((s) => (
                <div
                  key={s.id}
                  className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#1C2422]">
                        {s.displayName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#5E6764]">
                        {s.neighborhood} (Sector {s.postalDistrict})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular font-semibold text-[#14453D]">
                        S${s.hourlyRateSgd}/hr
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold inline-flex items-center gap-1 ${
                          s.vettingStatus === 'APPROVED'
                            ? 'text-[#0F766E]'
                            : s.vettingStatus === 'REJECTED'
                            ? 'text-[#B91C1C]'
                            : 'text-[#B45309]'
                        }`}
                      >
                        {s.vettingStatus === 'APPROVED' && (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        {s.vettingStatus}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#1C2422]">{s.headline}</p>
                    <p className="text-xs text-[#5E6764] leading-relaxed">{s.bio}</p>
                    <p className="text-xs text-[#5E6764]">
                      {s.yearsExperience} yrs exp · {s.languages} · {s.certifications}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onVetDecision(s.id, 'APPROVED')}
                      disabled={s.vettingStatus === 'APPROVED'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14453D] text-white text-xs font-semibold rounded-lg hover:bg-[#0F362F] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Vet
                    </button>
                    <button
                      type="button"
                      onClick={() => onVetDecision(s.id, 'REJECTED')}
                      disabled={s.vettingStatus === 'REJECTED'}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D9D6CE] text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Care Inquiries Queue */}
          <div className="bg-white border border-[#E6E4DE] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E6E4DE]">
              <h2 className="text-base font-semibold text-[#1C2422]">
                Parent Care Inquiries ({inquiries.length})
              </h2>
            </div>
            {inquiries.length === 0 ? (
              <p className="p-6 text-sm text-[#5E6764]">No parent inquiries submitted yet.</p>
            ) : (
              <div className="divide-y divide-[#E6E4DE]">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="p-5 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#5E6764]">
                      <span className="font-semibold text-[#1C2422]">
                        {inq.name} · {inq.email}
                      </span>
                      <span className="font-mono-tabular">
                        {new Date(inq.createdAt).toLocaleDateString('en-SG')}
                      </span>
                    </div>
                    <p className="text-sm text-[#5E6764]">{inq.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
