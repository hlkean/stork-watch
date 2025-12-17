# Stork Watch Architecture Outline

## Backend Services / Modules
- Core domain: `users` (account profiles), `auth` (OTP via Twilio Verify/fallback SMS), `pregnancies` (lifecycle state, due date, metadata), `memberships` (parent/coparent/subscriber roles), `invites` (tokenized SMS/email invites with group tags), `updates` (text/media posts), `birth-announcements` (final state, stats), `messages` (subscriber replies, threading).
- Communication: `sms-gateway` (Twilio inbound webhook, outbound sender, delivery status), `email-gateway` (transactional provider abstraction), `media` (Twilio media/Web storage handlers).
- Access control: `rbac` (per-pregnancy permissions, group targeting), `session` (JWT/NextAuth custom adapter).
- Persistence: `db` (Prisma client, migrations, repositories per aggregate), `cache` (rate limits, short-lived OTP/session state), `queue` (background sends, retries).
- Observability: `logging`, `metrics`, `audit` (message sends, invites, updates), `feature-flags`.
- API surface: `/api/auth/*`, `/api/pregnancies/*`, `/api/invites/*`, `/api/updates/*`, `/api/messages/*`, `/api/birth/*`, `/api/groups/*`, `/api/uploads/*`.

## Frontend Routes / Views (Next.js)
- Public: `/` (marketing/overview), `/auth/login` (phone entry, OTP verify), `/auth/register` (name + phone/email, role select, subscription code input), `/invite/[token]` (accept invite, optional register), `/verify` (OTP form).
- App shell: `/dashboard` (list pregnancies user belongs to), `/settings` (profile, notification preferences).
- Pregnancy space: `/pregnancy/[id]` (private page with timeline and status), `/pregnancy/[id]/updates` (list/create), `/pregnancy/[id]/update/[updateId]` (detail with replies), `/pregnancy/[id]/birth` (announcement view), `/pregnancy/[id]/members` (manage parents/subscribers), `/pregnancy/[id]/groups` (segment management), `/pregnancy/[id]/invites` (send/manage invites), `/pregnancy/[id]/messages` (inbound replies inbox).
- Admin-ish: `/uploads` (media management if needed), `/onboarding` (first-pregnancy setup wizard).

## Shared Utilities / Packages
- `lib/auth` (OTP flows, session helpers, guards, middleware), `lib/validation` (zod schemas/DTOs), `lib/api-client` (typed fetchers/SWR/hooks), `lib/prisma` (singleton client), `lib/twilio` (client + helpers), `lib/storage` (media upload/resizing), `lib/notifications` (SMS/email templating + dispatcher), `lib/feature-flags`, `lib/rbac` (policy checks), `lib/observability` (logger/metrics), `lib/queue` (job dispatch), `lib/types` (domain models), `lib/ui` (design system components, form primitives).
