# User Prompts History

This file collates all prompts sent in this session in chronological order. Any sensitive credentials (such as the GitHub personal access token) have been redacted for security.

---

## Prompt 1 — Initial Marketplace Specification

```markdown
# ROLE
Act as a Principal Full-Stack Engineer and Product Architect specializing in two-sided local service marketplaces, Next.js (App Router), TypeScript, Tailwind CSS, and Supabase. You prioritize rapid MVP execution, clean modular architecture, mobile-first UX, and strict adherence to Singapore local market nuances (SGD currency, 6-digit postal codes, PayNow, and PDPA data minimization).

# GOAL
Build a functional, production-ready Minimum Viable Product (MVP) for an on-demand babysitting marketplace in Singapore. The platform must allow parents to search vetted babysitters by Singapore postal code, select a date/time window, pay securely in SGD via Stripe Checkout (with PayNow enabled), and unlock direct WhatsApp coordination once payment succeeds. Reference Aunty.sg app for its functionality, not its look and feel.

# OUTPUT
Deliver the MVP implementation in structured, copy-paste-ready phases:
1. **System Architecture & Folder Structure:** Clean Next.js 14+ App Router layout (`/app`, `/components`, `/lib`, `/actions`, `/api/webhooks`).
2. **Database Schema (SQL):** Complete PostgreSQL/Supabase schema with Row-Level Security (RLS) policies for `profiles`, `sitter_profiles`, `bookings`, and `reviews`.
3. **Core API Integrations:**
   - **OneMap Search API Wrapper (`/lib/onemap.ts`):** Converts a 6-digit Singapore postal code into exact building name, street address, and `lat/lng`, plus a Haversine distance filter to match nearby sitters.
   - **Stripe Checkout + PayNow Integration (`/app/api/checkout/route.ts` & `/app/api/webhooks/stripe/route.ts`):** Creates an SGD checkout session (`payment_method_types: ['card', 'paynow']`), calculates platform fee vs. sitter payout, and updates booking status to `CONFIRMED` on `checkout.session.completed`.
   - **WhatsApp Deep-Link & Notification Helper (`/lib/notifications.ts`):** Generates pre-filled `https://wa.me/65...` coordination links and sends transactional confirmation alerts only after payment is verified.
4. **Core Frontend Pages & Components:**
   - Parent Search & Sitter Feed (filter by postal code radius, hourly rate in SGD, age group experience, and "Founder Vetted" badge).
   - Booking Flow & Checkout Summary (date, start/end hours, number of kids, emergency notes, price breakdown).
   - Sitter Dashboard (toggle availability, view confirmed bookings, one-tap WhatsApp parent button).
   - Admin Vetting Queue (simple protected view to approve/reject sitter profiles).
   - Include option to send inquiry via google form with name, email address and details text box field
    - Include a FAQ section to address basic concerns about the service

# GUARDRAILS
- **MVP Scope Discipline:** Do NOT build in-app real-time chat, live GPS map tracking, Singpass OAuth, or Stripe Connect split-payouts. Keep payouts manual on the backend and communication via WhatsApp deep-links.
- **PDPA Compliance:** Never store raw NRIC numbers, full residential unit numbers on public profiles, or unencrypted ID documents in the database. Expose only neighborhood/district names and masked verification booleans (`is_vetted: true`).
- **Privacy Gate:** Never expose a sitter's or parent's phone number or `wa.me` link on the frontend until the booking status in the database is strictly `CONFIRMED`.
- **Code Quality:** Use strict TypeScript interfaces, Server Actions for mutations, Zod for input validation (including Singapore 6-digit postal code regex `^\d{6}$` and `+65` phone validation), and clear environment variable placeholders (`.env.example`).

# CONTEXT
- **Target Market:** Singapore families (local and expat) needing short-notice or scheduled home babysitting (minimum 3-hour booking block, standard rates SGD $18–$28/hr).
- **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, Supabase (Auth + Postgres), Stripe SDK (SGD + PayNow), OneMap REST API (Singapore Land Authority).
- **Booking State Machine:** `DRAFT` -> `PENDING_PAYMENT` -> `CONFIRMED` -> `COMPLETED` (or `CANCELLED`).
- **Execution Instruction:** Start by outputting the **Database Schema (SQL)**, **Environment Variables**, and **Core API Wrappers (`OneMap` + `Stripe/PayNow`)** first, then ask me to confirm before generating the frontend UI components.
```

---

## Prompt 2 — Cloud SQL Confirmation

```text
Enable Cloud SQL in region asia-southeast1
```

---

## Prompt 3 — GitHub Push Request

```text
git push https://<GITHUB_PAT_REDACTED>@https://github.com/Philipgoh-tech/KampungCare
```

---

## Prompt 4 — Error Fix Request

```text
Fix the errors in the app
```
*(Triggered on `FirebaseError: Firebase: Error (auth/popup-closed-by-user)`)*

---

## Prompt 5 — Collate Prompts

```text
collate all prompts that I have sent and store them into file named prompts.md
```
