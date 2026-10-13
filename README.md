# Secure Event Management System (SEMS) — UPTM

FYP2 implementation of the Secure Event Management System proposed in FYP1
("Secure Event Management System for Educational Institutions: A UPTM Case Study").

A web-based platform that replaces UPTM's manual, paper-based club/society event
proposal process with a centralized, role-based, auditable workflow.

## Tech Stack

- **Frontend:** React.js + Vite + TailwindCSS
- **Backend:** Node.js + Express.js
- **Database:** MySQL
- **Security:** bcrypt (password hashing), JWT (sessions), helmet.js (HTTP hardening),
  multer (secure file upload), express-rate-limit (brute-force protection),
  google-auth-library (verifies "Sign in with Google" ID tokens),
  nodemailer (sends 6-digit OTP codes for signup/password-reset/email-change)

## User Roles (RBAC)

Four roles, enforced by both the UI (nothing unreachable is shown) and the API
(every route checks the role server-side — see `backend/src/middleware/rbacMiddleware.js`):

| Role | Capabilities |
|---|---|
| Club Committee | Create proposals in a 6-step form (save drafts), track status on a timeline, answer HEPA's queries and resubmit, post-event reports |
| HEPA Officer | Review proposals and their documents; generate the official BHEP.ML.01.04A-00 budget form (filled in, plus a Lampiran A budget page) for the Penasihat/BHEP, Setiausaha ATAP Kolej and Pengarah to sign; approve (only after confirming all three signatures), reject (reason required) or query |
| Admin | Manage users, clubs and events; monitor all proposals; view audit logs; system settings |

New Club Committee accounts are self-registerable
at `/register` and become active as soon as the person verifies a 6-digit code
emailed to them — see [Registration & Account Verification](#registration--account-verification)
below. HEPA Officer and Admin accounts are never self-registerable (a HEPA account can approve proposals); they're created directly in
the database or by an existing Admin from `/admin/users`.

**Separation of duties**: approving/rejecting a proposal is HEPA's decision alone —
Admin cannot approve or reject (`/api/proposals/:id/approve|reject|query` are
`hepa_officer`-only). Admin instead gets a read-only Proposal Monitoring view,
plus a distinct administrative *override* to cancel an already-approved event
(`POST /api/proposals/:id/cancel`, reason required, audit-logged, and recorded
separately from HEPA's original approval so "Approved by HEPA" is never overwritten).

| Function | Committee | HEPA | Admin |
|---|---|---|---|
| View Events | ✅ | ✅ | ✅ |
| Submit Proposal | ✅ | – | – |
| View Own Proposals | ✅ | – | – |
| View All Proposals | – | ✅ | ✅ (read-only) |
| Approve / Reject Proposal | – | ✅ | – |
| Cancel an Approved Event | – | – | ✅ (override, reason required) |
| Manage Users / Clubs | – | – | ✅ |
| View Audit Logs | – | – | ✅ |
| System Settings | – | – | ✅ |

There is no Student role: it was removed in migration 013 (existing student accounts were deleted).

## Registration & Account Verification

Registration, password reset, and email change are all **self-service** — a
6-digit code emailed to the relevant address stands in for identity
verification, with no Admin review step in any of the three flows:

```
Register (role-specific fields + password confirmation)
  → Submit → a 6-digit code is emailed, nothing is created yet
  → Enter the code → account created with status = 'active' → logged in immediately
```

The pending registration (including the bcrypt-hashed password) lives only in
`otp_codes.payload` as JSON until the code is verified — an abandoned signup
never leaves a half-created account behind. Codes are stored as a bcrypt hash
(never plaintext), expire after 10 minutes, and are capped at 5 wrong guesses
each (`backend/src/utils/otp.js`); the same request/verify pattern is reused
for:

- **Forgot Password** (`/forgot-password`) — three separate steps: request a
  code by username/email, verify it (`POST /api/auth/forgot-password/verify`
  checks the code without using it up), then set a new password
  (`/api/auth/reset-password` re-checks the code and consumes it).
- **Change Email** (`/change-email`, linked from `/profile`) — request a code
  sent to the *new* address (to prove ownership of it), then verify to actually
  update `users.email`.

All three share one code-entry UI (`frontend/src/components/auth/OtpVerification.jsx`):
six boxes with paste support, a 10-minute countdown, a 60-second resend
cooldown, and a "N attempts left" warning driven by the `attemptsLeft` field the
API returns on a wrong code. Login has a "Remember me" option: ticked keeps the
session token in `localStorage`, unticked keeps it in `sessionStorage` (gone when
the tab closes).

**Account status** (`users.status`): 🟢 `active`, ⚫ `deactivated` (set by an
Admin suspending an account). `pending`/`rejected` remain in the schema for
backward compatibility with historical `audit_logs` entries but no longer
occur — every self-registered or Admin-created account is active immediately.

**Changing your password.** Profile has a *Change password* form (current password, new
password, confirmation) for every role (`POST /api/users/me/password`). The current password is
required, wrong guesses count toward the same per-account lockout as sign-in, and a successful
change signs out every other session: `users.password_changed_at` is stamped and any token issued
before it is refused. The browser that made the change gets a fresh token and stays signed in.
Completing "Forgot password" or an Admin reset invalidates older sessions the same way.

Every step (registration submitted/verified, password-reset requested/completed,
email-change requested/completed, login success/failed/blocked) is written to
`audit_logs` with the acting user and timestamp — see
[Google OAuth setup](#google-oauth-setup-optional) below for the email
configuration this needs, and [Email Delivery](#email-delivery-otp-codes) for
the Gmail SMTP setup.

**Sign in with Google** (optional — hidden until configured) swaps the
password+OTP steps for a verified Google identity. A Google account that
doesn't yet exist in SEMS is sent to a short completion form (role + ID
number only, since Google already supplies name/email) and created active
immediately — Google's own email verification stands in for the OTP step.

## Proposal Workflow

```
Draft → Submitted → Under Review → Approved
                          ↓
                       Query → Resubmitted → (back to Under Review)
                          ↓
                       Rejected
```

- **Draft** is a private working copy: only the Club Committee that owns it can
  see it (HEPA, Admin, the calendar and every report ignore drafts). Saved from
  the proposal form with *Save Draft*; it can be edited or deleted freely.
- **Submitted → Under Review**: the moment a HEPA officer opens a submitted (or
  resubmitted) proposal, it is marked *Under Review* (`POST /api/proposals/:id/start-review`)
  and audited, so the committee can see someone picked it up.
- **Query**: HEPA asks for changes with a mandatory remark. The committee edits
  the proposal (documents can be replaced or removed) and **resubmits**, which
  bumps the version. A queried proposal cannot be quietly saved as a draft.
- Approve / reject / query only work on a proposal that is actually awaiting a
  decision — approving a draft or an already-decided proposal returns `409`.
- Every step is written to `audit_logs`; the proposal page shows that trail as
  its status timeline, review history and audit activity.

### Proposal form (Club Committee)

Six steps — Event Information, Organizer Information, Venue & Schedule, Budget,
Documents, Review & Submit — with per-step validation and plain-language errors.
The budget is an editable table (item, description, quantity, unit price, row
total) whose grand total becomes the proposal's budget (`proposal_budget_items`
table). Documents are drag-and-dropped; each file is tagged Proposal / Budget /
Supporting and shown as a card with Preview, Download (when saved) and Remove.
The same form handles creating, editing a draft and *Edit & Resubmit* after a
query (`/club/new`, `/club/proposals/:id/edit`).

### Pages by role

| Role | Pages |
|---|---|
| Club Committee | `/club` dashboard (stats, proposals table, proposal tracking timeline), `/club/proposals`, `/club/new`, `/club/proposals/:id`, `/club/proposals/:id/edit`, `/club/reports`, `/events`, `/calendar` |
| HEPA Officer | `/hepa` (overview), `/hepa/review` (proposal cards, filters, slide-over review panel), `/hepa/proposals/:id` (full page), `/hepa/events` (approved events), `/calendar`, `/hepa/reports` (analytics + post-event spending) |
| Admin | `/admin` (stats, analytics charts, activity feed, date range, export), `/admin/audit-logs`, plus the existing management pages; `/admin/proposals/:id` uses the shared proposal page (read-only plus the cancel override) |

**HEPA review workflow.** `/hepa/review` lists the queue as cards (event, club, date,
budget, submitted date, status and a *priority* badge). Priority is a simple, visible
rule — *High*: event within 14 days or waiting 7+ days; *Medium*: within 30 days or
waiting 3+ days — and the badge states its reason. Filters: search, status, budget band,
event date range, sort. Clicking a card opens a slide-over with the whole proposal
(facts, budget, documents, history), Query / Reject / Approve in the footer, and
previous / next to move along the queue; after a decision it advances to the next
proposal and a toast confirms the result. Approve shows a summary and a warning;
Query and Reject require an explanation (10+ characters).

**Event calendar** (`/calendar`, every role): Month / Week / List views, search, and
club / category / date-range filters — all kept in the URL. Clicking an event opens a
slide-over. The approved budget, documents and a *View Full Details* link appear only
for HEPA, Admin and the committee that owns the event; students never receive the
budget (the API sends it only to those roles).

**Analytics** (`GET /api/analytics?from=&to=`, HEPA and Admin): proposals over time,
approved vs rejected (decisions per month, from the audit trail), proposals by
category and monthly budget requests, for a chosen date range. Charts are small
dependency-free SVG components with tooltips (hover and keyboard focus), a legend and
a Chart / Table switch. The Admin Dashboard can export the analytics or the activity
log as CSV and print to PDF.

**Audit log.** Every entry now also records the caller's **IP address** and browser
(captured per request via `AsyncLocalStorage`, see `backend/src/utils/requestContext.js`)
and a **result** (`success` / `failure` / `blocked`). `/admin/audit-logs` shows
timestamp, user, role, action, module, target, IP and result, with filters for user,
role, action, module, result and date, pagination, a detail slide-over and CSV export
(`GET /api/audit-logs/export`, formula-injection safe). Entries written before
migration 010 show `—` for IP.

Club Committee and HEPA pages share a top bar with search,
notifications and an account menu. Notifications are not stored separately:
`GET /api/notifications` derives them from the audit trail (HEPA decisions for committees, new/resubmitted proposals for HEPA)
and the browser remembers which it has already shown.

## Project Structure

```
SEMS-UPTM/
├── backend/            Express API (auth, RBAC, proposals, uploads, audit log)
│   ├── src/
│   │   ├── config/      DB connection pool
│   │   ├── controllers/ Route handlers
│   │   ├── middleware/  authenticate, authorize (RBAC), file upload validation
│   │   ├── routes/
│   │   └── utils/       audit logger
│   ├── uploads/         Uploaded files (randomized filenames, gitignored)
│   └── server.js
├── frontend/            React + Vite + Tailwind SPA
│   └── src/
│       ├── api/            axios client (attaches JWT)
│       ├── context/        AuthContext
│       ├── constants/      shared enums (event types)
│       ├── utils/          date/time formatting
│       ├── hooks/          useEvents, useMyProposals, useProposalDetail, ...
│       ├── components/
│       │   ├── ui/         design-system primitives (Button, Card, Modal, SlideOver, Stepper, ...)
│       │   ├── layout/     Sidebar, TopBar + DashboardLayout (role-based nav)
│       │   ├── auth/       AuthLayout, PasswordField, OTP input/verification
│       │   ├── events/     EventCard, EventSlideOver, MonthCalendar
│       │   └── proposal/   StatusTimeline, ProposalWorkflow, ProposalsTable,
│       │                   DocumentCard, wizard/ (6-step form pieces)
│       └── pages/          Home (redirect), Events, CalendarPage,
│                            club/ (Dashboard, MyProposals, ProposalForm,
│                            ProposalDetail, PostEventReports),
│                            hepa/ (Dashboard, ReviewProposal),
│                            admin/ (Dashboard, Users, Clubs, ClubDetail, Events,
│                            Proposals, ProposalDetail, Reports, AuditLogs, Settings),
│                            Login, Register, ForgotPassword, ChangeEmail, Profile
└── database/
    ├── schema.sql          MySQL schema (users, clubs, proposals, documents,
    │                       budget items, remarks, post_event_reports, audit_logs,
    │                       system_settings, otp_codes) — the full, current schema for a fresh install
    └── migrations/         Incremental ALTER TABLE scripts for existing databases
```

## Getting Started

### 1. Database

Start MySQL (e.g. via XAMPP Control Panel), then load the schema:

```bash
mysql -u root < database/schema.sql
```

This creates the `sems_uptm` database and all tables. If you already have an
older copy of the database, apply the migrations in order instead:

```bash
mysql -u root sems_uptm < database/migrations/001_add_proposal_fields.sql
mysql -u root sems_uptm < database/migrations/002_add_admin_features.sql
mysql -u root sems_uptm < database/migrations/003_registration_and_verification.sql
mysql -u root sems_uptm < database/migrations/004_add_applicant_details.sql
mysql -u root sems_uptm < database/migrations/005_add_google_oauth.sql
mysql -u root sems_uptm < database/migrations/006_otp_self_service.sql
mysql -u root sems_uptm < database/migrations/007_account_lockout.sql
mysql -u root sems_uptm < database/migrations/008_fix_otp_expires_at.sql
mysql -u root sems_uptm < database/migrations/009_proposal_wizard.sql
mysql -u root sems_uptm < database/migrations/010_audit_context.sql
mysql -u root sems_uptm < database/migrations/011_password_changed_at.sql
mysql -u root sems_uptm < database/migrations/012_signoff_acknowledgement.sql
mysql -u root sems_uptm < database/migrations/013_remove_student_role.sql
mysql -u root sems_uptm < database/migrations/014_proposal_organizer_name.sql
mysql -u root sems_uptm < database/migrations/015_proposal_club.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` — set `DB_PASSWORD` to match your MySQL root password (XAMPP
default is usually blank), set `JWT_SECRET` to a long random string, and set
`GMAIL_USER`/`GMAIL_APP_PASSWORD` so the app can actually send the 6-digit
codes registration/password-reset/email-change all depend on — see
[Email Delivery](#email-delivery-otp-codes) below. `GOOGLE_CLIENT_ID` is optional.

```bash
npm run dev
```

API runs on http://localhost:5000. Health check: `GET /api/health`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on http://localhost:5173 (Vite dev server proxies `/api` to the
backend on port 5000).

### 4. Try it out

1. Register a **Club Committee** account and a **HEPA Officer** account at
   `/register` — each sends a 6-digit code to the email you gave; enter it to
   activate the account and you're logged straight in, no Admin step needed.
2. Log in as Club Committee → **Submit New Proposal** (`/club/new`) with event info,
   organiser info, and optional proposal/budget/supporting documents.
3. Log in as HEPA Officer → open the proposal from the dashboard and **Approve**,
   **Reject** (reason required, via a confirmation dialog), or **Request Changes**.
4. If changes were requested, log back in as Club Committee to revise and resubmit
   from the proposal detail page — rejection reasons and HEPA remarks are shown there too.
5. Once approved, the event appears on the public calendar (`/`) for any logged-in
   user, with search and category filtering.
6. Approved events can have a post-event report submitted by the Club Committee.
7. Log in as Admin → `/admin` for system-wide stats and recent activity,
   `/admin/clubs` to register a club and assign a Club Committee account to it,
   `/admin/users` to add/edit accounts or deactivate one, `/admin/proposals` and
   `/admin/events` for read-only monitoring (with an explicit, reason-required
   override to cancel an already-approved event, and a 30-day-after-cancellation
   gate before a cancelled event can be permanently deleted), `/admin/reports` for
   status/club/category/monthly breakdowns, and `/admin/audit-logs` for the full
   security trail.
8. From `/profile`, any logged-in user can upload a profile photo and change
   their email (a 6-digit code sent to the *new* address confirms it before
   `users.email` is actually updated — see
   [Registration & Account Verification](#registration--account-verification)).

To get your first Admin account (not self-registerable, by design — assign manually):

```sql
UPDATE users SET role = 'admin', status = 'active' WHERE email = 'someone@uptm.edu.my';
```

From then on, that Admin can create further Admin/HEPA/Club Committee accounts
directly from `/admin/users`.

## Running it for UAT (online, from a laptop)

For UAT, SEMS runs in production mode: the frontend is built and served from the
backend itself (one address, one process) behind a Cloudflare Tunnel so remote testers
reach it over HTTPS (planned address: `https://sems-uptm.afifnajmi.com`). Full steps:
[docs/uat/DEPLOY-UAT.md](docs/uat/DEPLOY-UAT.md).

Production-mode behaviour worth knowing:
- The server **refuses to start** when `NODE_ENV=production` and `JWT_SECRET` is short or still
  a placeholder, or `FRONTEND_URL` is not `https://` (`backend/src/config/validateEnv.js`).
- `TRUST_PROXY` makes Express read the visitor's real IP from `X-Forwarded-For`, so rate limits
  and audit-log IPs are per visitor instead of one shared tunnel address.
- `LOGIN_RATE_MAX`, `OTP_RATE_MAX` and `GLOBAL_RATE_MAX` raise the per-IP limits for networks where
  many testers share one public IP. The general limit now applies to `/api` only.
- A Content-Security-Policy allows only the app's own scripts plus Google sign-in; the theme
  script moved to `frontend/public/theme-init.js` so no inline script is needed.

## Email Delivery (OTP Codes)

Registration, password reset, and email change all depend on actually being
able to send email — without it, those three requests fail (the OTP record is
still created, but `sendOtpEmail` throws). Setup takes about 2 minutes:

1. The Gmail account needs 2-Step Verification turned on (required for App Passwords).
2. Generate one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   — a 16-character password, scoped to sending mail only, separate from the
   account's normal login password and revocable any time.
3. Set both in `backend/.env`:
   ```
   GMAIL_USER=youraccount@gmail.com
   GMAIL_APP_PASSWORD=the16characterapppassword
   ```
4. Restart the backend.

`backend/src/utils/mailer.js` sends through Gmail's SMTP via `nodemailer`;
swapping in a different provider (SendGrid, Resend, etc.) later only means
changing that one file.

## Google OAuth Setup (Optional)

"Sign in with Google" is entirely optional — both the backend and frontend hide
it automatically until it's configured, so skip this section if you don't need it.

1. [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → OAuth consent screen** → User type **External** → fill in
   the app name and support/developer email.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173` (and your production
     frontend origin, if deploying)
   - Leave redirect URIs empty — this flow only verifies ID tokens client-side,
     it never does a server-side authorization-code exchange, so no client
     secret is needed anywhere.
4. Copy the **Client ID** into both:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...` (verifies the token's signature/audience)
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=...` (initializes the button)
5. Restart both dev servers (Vite only reads `.env` at startup).

A Google sign-in for an email SEMS has never seen is routed to a short
completion form (role + Student/Staff ID, same fields manual registration asks
for) and created active immediately — Google's own verification of the email
stands in for the 6-digit code a manual signup would need. Signing in with
Google using an email that already has a SEMS account links the two
automatically (`users.google_id`); an existing `deactivated` account is still
blocked the same way a password login would be.

## Security Notes

- Passwords hashed with bcrypt (12 salt rounds); Admin can never see a user's
  actual password — resets go through a one-time code emailed to the account,
  not a visible value, and a user resets their own password directly.
- Signup, password-reset, and email-change codes are 6 digits, stored as a
  bcrypt hash (never plaintext) in `otp_codes`, expire after 10 minutes, and
  are capped at 5 wrong guesses each before a fresh code must be requested
  (`backend/src/utils/otp.js`) — this bounds brute-forcing the 6-digit space
  far below what rate-limiting alone would allow. Duplicate email/username/ID
  number are rejected before a code is ever sent.
- No account row exists for a pending signup until its code is verified — the
  form data (including the already-hashed password) sits only in
  `otp_codes.payload` until then, so an abandoned registration never leaves a
  half-created account.
- Sessions via short-lived JWTs (default 8h, configurable via `JWT_EXPIRES_IN`).
- Google sign-in verifies the ID token's signature and audience server-side
  (`google-auth-library`) on every request — the client-asserted email/name/sub
  in a credential is never trusted directly, only what Google's own verification
  returns. A Google-only account gets an unusable random `password_hash` (nobody
  knows it), so it can only ever sign in again via Google, never a guessed password.
- File uploads validated by extension whitelist + MIME type + stored under a
  cryptographically random filename (see `backend/src/middleware/uploadMiddleware.js`);
  profile photos use a separate, more restrictive upload path (`.jpg/.jpeg/.png`, 3MB max).
- Every state-changing action (registration submitted/verified, login, proposal
  submit/approve/reject/query/resubmit, report submission, user role changes,
  password-reset requested/completed, email-change requested/completed) is
  written to `audit_logs` with the acting user and timestamp.
- Login, registration, and OTP request/verify endpoints are all rate-limited in
  addition to a general API-wide rate limit. That limiter is per-IP, so it can't
  stop one account being guessed at from many IPs — hence a second,
  per-account layer: 5 consecutive wrong passwords (failures more than 15
  minutes apart don't add up) lock that account for 15 minutes
  (`authController.login`, `users.failed_login_attempts`/`locked_until`). A
  locked account refuses even the correct password, the counter is incremented
  atomically in SQL so parallel guesses can't slip past it, and a completed
  Forgot Password (proof of email ownership) or an Admin password reset lifts the
  lock. Known trade-off: an attacker can deliberately lock someone else's account
  for 15 minutes at a time (inherent to any lockout scheme; it's temporary and
  audit-logged as `ACCOUNT_LOCKED`).
- Rejecting or querying a proposal requires a non-empty reason (enforced in
  `proposalController.js`, not just in the UI); so does an Admin's event-cancellation
  override.
- `authenticate` re-reads the user's role and `status` from the database on every
  request rather than trusting the JWT's claims — deactivating an account or changing
  a role takes effect immediately, not just after the existing token expires.
- Admin can never change their own role or deactivate their own account
  (principle of least privilege — enforced in `userController.js`, not just disabled
  in the UI).
- A cancelled event can only be permanently deleted 30 days after cancellation
  (`ARCHIVE_DELETE_AFTER_DAYS` in `proposalController.js`) — before that it sits in
  a visible archive so it isn't lost by accident.
- Upload limits (max size, allowed extensions) are read from `system_settings` at
  request time (`backend/src/middleware/uploadMiddleware.js`), so Admin's Settings
  page genuinely changes what the server accepts — it isn't a decorative form.
- Registration deliberately does not collect or require identity documents —
  email ownership (via the 6-digit code, or Google's own verification) is the
  only identity check, not a claim of verifying who someone actually is.

## Design System

UPTM-branded, two accent scales defined once in `frontend/src/index.css` via
Tailwind's `@theme` (`--color-brand-*`, `--color-navy-*`), used deliberately
rather than everywhere:

- **`brand` (red, `#C8102E` / `#A80D26`)** — primary actions (Submit, Save,
  Login) and "this is active/selected" (the active sidebar item, a selected
  filter pill). Never used for plain informational content.
- **`navy` (blue, `#003B70` / `#002B52`)** — navigation and structural chrome:
  the top bar, the sidebar, and informational tags/icons (category badges,
  "Total X" stat cards). Content areas (cards, tables) stay white; page
  background is `#F5F7FA`; status badges keep their own semantic colours
  (amber/green/red/slate) independent of both accent scales.
- Reusable primitives in `frontend/src/components/ui/`: `Button` (primary/
  secondary/success/danger/ghost), `StatusBadge`, `Card`, `StatCard`, `Modal`,
  `ConfirmModal`, `Alert`, `FormField` (`TextField`/`TextareaField`/`SelectField`),
  `FileDropzone`, `Table`, `Pagination`, `BarList` (single-hue magnitude bars
  for the Reports page), `Skeleton`.
- Role-based navigation lives in `frontend/src/components/layout/` — only links
  to routes that exist for that role.

## What's Next (FYP2 roadmap)

- [x] ~~Email/notification on status change~~ — OTP emails ship for signup/password-reset/email-change; proposal-decision emails to Club Committee are not yet sent
- [x] ~~Secure document viewing/downloading from Admin's Proposal Monitoring / Event Management pages~~ — `GET /api/proposals/documents/:id`, authenticated + ownership/role-checked
- [ ] Pagination + filtering on HEPA's own pending-review list (Admin's equivalent lists already have both)
- [ ] Automated tests (backend integration tests, frontend component tests)
- [ ] Deployment (e.g. a small VPS or campus server) + HTTPS, and a production-grade email provider in place of personal Gmail SMTP
