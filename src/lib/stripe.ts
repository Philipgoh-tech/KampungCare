import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const isRealStripeConfigured =
  Boolean(stripeSecret) &&
  !stripeSecret?.includes('replace_with_your') &&
  stripeSecret!.startsWith('sk_');

export const stripeClient = isRealStripeConfigured
  ? new Stripe(stripeSecret!)
  : null;

export interface CreateSgdCheckoutInput {
  bookingId: number;
  bookingCode: string;
  sitterName: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalSgdCents: number;
  platformFeeSgdCents: number;
  sitterPayoutSgdCents: number;
  paymentMethod: 'paynow' | 'card';
  parentEmail: string;
  appUrl: string;
}

export async function createSgdStripeCheckoutSession(
  input: CreateSgdCheckoutInput
): Promise<{
  mode: 'stripe_live' | 'paynow_sandbox';
  sessionId: string;
  checkoutUrl: string | null;
}> {
  if (stripeClient) {
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      allowed_payment_method_types: ['card', 'paynow'],
      customer_email: input.parentEmail,
      line_items: [
        {
          price_data: {
            currency: 'sgd',
            product_data: {
              name: `Babysitting with ${input.sitterName}`,
              description: `${input.serviceDate} · ${input.startTime}–${input.endTime} (${input.durationHours}h) · Ref ${input.bookingCode}`,
            },
            unit_amount: input.totalSgdCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(input.bookingId),
        bookingCode: input.bookingCode,
        platformFeeSgdCents: String(input.platformFeeSgdCents),
        sitterPayoutSgdCents: String(input.sitterPayoutSgdCents),
      },
      success_url: `${input.appUrl}/?checkout=success&booking=${encodeURIComponent(
        input.bookingCode
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.appUrl}/?checkout=cancelled&booking=${encodeURIComponent(
        input.bookingCode
      )}`,
    });

    return {
      mode: 'stripe_live',
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  // Sandbox Stripe + PayNow session for immediate MVP testing when STRIPE_SECRET_KEY is not set
  const simulatedSessionId = `cs_sg_paynow_${input.bookingCode}_${Date.now()}`;
  return {
    mode: 'paynow_sandbox',
    sessionId: simulatedSessionId,
    checkoutUrl: null,
  };
}
