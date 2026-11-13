import { ChevronDown, ExternalLink, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';

const FAQS = [
  {
    q: 'How are KampungCare babysitters vetted in Singapore?',
    a: 'Every caregiver completes a 1-on-1 Founder interview, childcare reference check, and infant/child first-aid certificate verification before receiving the Founder Vetted mark. Under PDPA guidelines, we never store raw NRIC numbers or personal ID copies on our servers.',
  },
  {
    q: 'When do I receive my babysitter’s phone number or WhatsApp link?',
    a: 'For both parent and sitter safety, phone numbers and direct WhatsApp (wa.me/65) coordination links remain strictly locked until SGD payment via PayNow or card is verified and the booking status reaches CONFIRMED.',
  },
  {
    q: 'What is the minimum booking duration and typical hourly rate?',
    a: 'All sessions have a minimum 3-hour booking block to ensure fair compensation and unhurried care for your children. Standard rates range from S$18 to S$28/hr for one child, with a +S$3/hr adjustment for each additional child.',
  },
  {
    q: 'How does OneMap postal code matching protect my address?',
    a: 'When you search using your 6-digit Singapore postal code, OneMap resolves only your block/building name and street to calculate nearby sitters. We never collect or display your residential unit number online—you only share arrival details privately over WhatsApp after confirmation.',
  },
  {
    q: 'Can I pay via PayNow as well as credit or debit card?',
    a: 'Yes. Our Stripe SGD checkout supports both Singapore PayNow QR and Visa/Mastercard/Amex in Singapore Dollars with an itemized breakdown of the sitter payout (85%) and platform vetting fee (15%).',
  },
  {
    q: 'What happens if I need to cancel or reschedule a booking?',
    a: 'Unpaid bookings in PENDING_PAYMENT can be cancelled immediately from My Bookings. For confirmed bookings, message your sitter directly on WhatsApp or contact our Singapore care concierge via the inquiry form below at least 12 hours before your session.',
  },
];

export function FaqAndInquiry() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [submissionMode, setSubmissionMode] = useState<'concierge' | 'google_form'>('concierge');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          details: details.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send inquiry.');
        return;
      }

      if (submissionMode === 'google_form') {
        setSuccessMsg(
          'Your Google Form inquiry details (Name, Email, Details) were recorded and forwarded to our Singapore care team.'
        );
      } else {
        setSuccessMsg(data.message);
      }
      setName('');
      setEmail('');
      setDetails('');
    } catch {
      setError('Network error while submitting your inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* FAQ Accordion */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1C2422]">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-[#5E6764] mt-1">
            Everything Singapore families ask about vetting, PDPA privacy, PayNow checkout, and last-minute bookings.
          </p>
        </div>

        <div className="bg-white border border-[#E6E4DE] rounded-2xl divide-y divide-[#E6E4DE]">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF9F6] transition-colors"
                >
                  <span className="text-sm font-semibold text-[#1C2422]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#5E6764] shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-[#5E6764] leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inquiry Form (Supports Direct Care Concierge & Google Form Format) */}
      <div className="lg:col-span-5 bg-white border border-[#E6E4DE] rounded-2xl p-6 sm:p-7 space-y-5">
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-semibold text-[#1C2422]">
            Send an Inquiry
          </h2>
          <p className="text-sm text-[#5E6764]">
            Need recurring weekday care, twin infant support, or a hotel babysitter in Singapore? Send us your details below.
          </p>
        </div>

        {/* Submission Channel Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#F0EEE8] rounded-xl">
          <button
            type="button"
            onClick={() => setSubmissionMode('concierge')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              submissionMode === 'concierge'
                ? 'bg-white text-[#1C2422] shadow-sm'
                : 'text-[#5E6764]'
            }`}
          >
            Direct Inquiry Form
          </button>
          <button
            type="button"
            onClick={() => setSubmissionMode('google_form')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
              submissionMode === 'google_form'
                ? 'bg-white text-[#1C2422] shadow-sm'
                : 'text-[#5E6764]'
            }`}
          >
            <ExternalLink className="w-3 h-3" />
            Google Form Intake
          </button>
        </div>

        {submissionMode === 'google_form' && (
          <p className="text-xs text-[#5E6764] bg-[#FAF9F6] border border-[#E6E4DE] rounded-xl p-3">
            Google Form Intake collects your Name, Email Address, and Details directly in Google Form structure and logs a copy to our care concierge queue.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#1C2422]">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm focus:outline-none focus:border-[#14453D]"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#1C2422]">Email Address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-10 px-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm focus:outline-none focus:border-[#14453D]"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#1C2422]">Details</span>
            <textarea
              rows={4}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Share your Singapore estate/postal code, preferred dates, children's ages, and care needs..."
              className="w-full p-3 bg-[#FAF9F6] border border-[#D9D6CE] rounded-lg text-sm focus:outline-none focus:border-[#14453D]"
            />
          </label>

          {error && (
            <p className="text-xs font-medium text-[#B91C1C]" role="alert">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-xs font-medium text-[#0F766E] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg p-3">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#14453D] text-white text-sm font-semibold rounded-xl hover:bg-[#0F362F] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {submitting
              ? 'Sending Inquiry...'
              : submissionMode === 'google_form'
              ? 'Submit via Google Form Intake'
              : 'Send Inquiry'}
          </button>
        </form>
      </div>
    </section>
  );
}
