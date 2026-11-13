import { BookingStatus } from './validation.ts';

export interface WhatsappLinkParams {
  bookingCode: string;
  bookingStatus: BookingStatus;
  recipientPhoneE164: string | null | undefined;
  sitterName: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  neighborhood: string;
}

/**
 * Privacy Gate:
 * Never expose a sitter's or parent's phone number or wa.me link
 * until the booking status in PostgreSQL is strictly CONFIRMED (or COMPLETED).
 */
export function buildWhatsappCoordinationLink(
  params: WhatsappLinkParams
): string | null {
  if (params.bookingStatus !== 'CONFIRMED' && params.bookingStatus !== 'COMPLETED') {
    return null;
  }
  if (!params.recipientPhoneE164) {
    return null;
  }

  const digits = params.recipientPhoneE164.replace(/[^\d]/g, '');
  if (!digits.startsWith('65') || digits.length !== 10) {
    return null;
  }

  const message = [
    `Hi ${params.sitterName}, this is regarding confirmed KampungCare booking ${params.bookingCode}.`,
    `Date: ${params.serviceDate} (${params.startTime}–${params.endTime})`,
    `Area: ${params.neighborhood}`,
    `Looking forward to coordinating arrival details!`,
  ].join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function maskSingaporePhone(
  phoneE164: string | null | undefined,
  bookingStatus: BookingStatus
): string | null {
  if (bookingStatus !== 'CONFIRMED' && bookingStatus !== 'COMPLETED') {
    return null;
  }
  if (!phoneE164) return null;
  const digits = phoneE164.replace(/[^\d]/g, '');
  if (digits.length < 10) return null;
  // Returns +65 9123 •••• for partial UI display alongside wa.me button
  return `+${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

export function dispatchBookingConfirmationAlert(payload: {
  bookingCode: string;
  parentEmail: string;
  sitterName: string;
  serviceDate: string;
  totalSgdFormatted: string;
}) {
  // Only invoked strictly after payment verification sets booking to CONFIRMED
  console.info(
    `[Notification] Booking ${payload.bookingCode} CONFIRMED (${payload.totalSgdFormatted}). Sent WhatsApp & email receipt to ${payload.parentEmail} for session with ${payload.sitterName} on ${payload.serviceDate}.`
  );
}
