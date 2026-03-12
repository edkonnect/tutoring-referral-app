# Tutoring Referral Manager - TODO

## Database Schema
- [x] Users table with role enum (admin | promoter)
- [x] Parents table (name, email, phone, promoter_id)
- [x] Students table (name, age, grade, subjects, parent_id, enrolled status)
- [x] Referrals table (promoter_id, student_id, status, credit amount, enrolled_at)
- [x] Payouts table (via referrals table status field)

## Backend API
- [x] Role-based middleware (adminProcedure, promoterProcedure)
- [x] Promoter: list/add/update/delete parents
- [x] Promoter: list/add/update/delete students per parent
- [x] Promoter: view own referrals and earnings summary
- [x] Admin: list all promoters
- [x] Admin: list all parents and students
- [x] Admin: confirm student enrollment (triggers $50 credit + email)
- [x] Admin: list all referrals
- [x] Admin: mark referral fee as paid (payout management)
- [x] Email notification to promoter on enrollment

## Frontend
- [x] Global theme and CSS variables (clean business style)
- [x] DashboardLayout with role-based sidebar navigation
- [x] Role-based routing (redirect based on user role)
- [x] Login / landing page
- [x] Promoter: Dashboard overview (stats cards)
- [x] Promoter: Parents list page with add/edit/delete
- [x] Promoter: Students list page per parent with add/edit/delete
- [x] Promoter: Referrals & Earnings page (pending/paid status)
- [x] Admin: Dashboard overview (stats cards)
- [x] Admin: Promoters management page
- [x] Admin: All parents & students view
- [x] Admin: Enrollment confirmation page
- [x] Admin: Payout management page

## Testing
- [x] Vitest tests for referral creation
- [x] Vitest tests for enrollment confirmation and credit logic
- [x] Vitest tests for payout marking

## Referral Link Feature
- [x] Add referralToken column to users table (unique, nanoid-generated)
- [x] Backend: generate/get referral token for promoter
- [x] Backend: public endpoint to resolve token → promoter info
- [x] Backend: public endpoint for parent self-registration via referral link
- [x] Public referral registration page (no login required)
- [x] Promoter dashboard: display referral link with copy button
- [x] Promoter dashboard: referral link card with copy, share, preview, and regenerate
- [x] Vitest tests for referral link generation and public registration (8 tests)

## Referral Link Visit Tracking
- [x] Add referral_link_visits table (id, promoter_id, visited_at, user_agent, ip)
- [x] DB helpers: logReferralVisit, getReferralVisitStats, getAllPromoterVisitStats
- [x] tRPC: public logVisit mutation, promoter getVisitStats query, admin getAllVisitStats query
- [x] Public registration page logs a visit on load (once per page load via useRef guard)
- [x] Promoter dashboard: ReferralLinkCard shows total visits, this week, and today
- [x] Admin Promoters table: Link Visits column with per-promoter total count
- [x] Vitest tests for visit logging and stats (7 new tests, 29 total passing)

## Conversion Rate Feature
- [ ] Backend: extend getVisitStats to include registrations count and conversionRate
- [ ] ReferralLinkCard: display conversion rate stat (registrations / visits × 100%)
- [ ] Vitest tests for conversion rate calculation

## Parent Information Entry Screen
- [x] Dedicated AddParent page with parent details form (name, email, phone, notes)
- [x] Optional inline student section to add one or more students in the same flow
- [x] Form validation with clear error messages
- [x] Success state with options to add another parent or view all parents
- [x] Navigation: Add Parent button on PromoterParents list and dashboard quick action
- [x] Route /promoter/parents/new registered in App.tsx
- [x] Vitest tests for parent creation with and without students (7 tests, 36 total passing)

## Edit Parent Form
- [x] EditParent page at /promoter/parents/:id/edit pre-populated with existing data
- [x] Parent fields (name, email, phone, notes) pre-filled and editable
- [x] Existing students listed inline with edit and delete per student
- [x] Add new students inline from the edit page
- [x] Form validation matching AddParent screen
- [x] Success state navigating back to parents list
- [x] Edit button on PromoterParents list cards navigates to edit page
- [x] Route /promoter/parents/:id/edit registered in App.tsx
- [x] Vitest tests for parent update and student management (8 tests, 44 total passing)

## Full CRUD for Parents, Students, Promoters

### Backend
- [x] Admin: createPromoter procedure (invite user as promoter)
- [x] Admin: updatePromoter procedure (name, email)
- [x] Admin: deletePromoter procedure (with guard: no active referrals)
- [x] Promoter: getParentById procedure (for detail view)
- [x] Student: getById exposed as tRPC procedure

### Admin Promoter Management UI
- [x] Admin Promoters: Add Promoter button → create form (name, email)
- [x] Admin Promoters: Edit promoter inline dialog (name, email)
- [x] Admin Promoters: Delete promoter with AlertDialog confirmation

### Promoter Parents CRUD UI
- [x] Parents list: AlertDialog delete confirmation with student count badges
- [x] Parents list: search filter + enrolled count badges

### Promoter Students CRUD UI
- [x] Students list: add student dialog (select parent, fill details)
- [x] Students list: edit student dialog (pre-filled)
- [x] Students list: AlertDialog delete confirmation

### Tests
- [x] Vitest tests for promoter CRUD (admin-only guards) — 13 tests, 57 total passing

## Promoter Invite & Email/Password Auth
- [x] DB: promoter_invites table (token, user_id, expires_at, used_at)
- [x] DB: promoter_credentials table (user_id, password_hash)
- [x] Backend: generate invite token on admin createPromoter
- [x] Backend: send confirmation email with setup link on promoter creation
- [x] Backend: public resolveInvite procedure (validate token)
- [x] Backend: public setupAccount procedure (set email + password, mark invite used)
- [x] Backend: public promoterLogin procedure (email + password → JWT session cookie)
- [x] Backend: resendInvite admin procedure (resends invite email)
- [x] Public Account Setup page (/setup/:token) — set email + password
- [x] Landing page: email/password login form for promoters
- [x] Landing page: show both Manus OAuth and email/password login options
- [x] Vitest tests for invite flow, setup, and login (12 tests, 69 total passing)

## Product Promotion System
### Database
- [x] products table (id, name, description, price, category, active, createdAt)
- [x] product_promotions table (id, promoter_id, parent_id, product_id, sent_at, message)
- [x] product_enrollments table (id, promotion_id, enrolled_at, credit_amount=$25, status=pending|paid)

### Backend API
- [x] Admin: CRUD for products (create, update, delete, list)
- [x] Promoter: list available products
- [x] Promoter: send product promotion to a parent (with optional message)
- [x] Promoter: list own sent promotions and their enrollment status
- [x] Admin: list all product promotions
- [x] Admin: confirm product enrollment (triggers $25 credit + email to promoter)
- [x] Admin: mark product promotion credit as paid
- [x] Email notification to promoter when product enrollment confirmed

### Promoter UI
- [x] Products page: browse available products with details
- [x] Send Promotion dialog: select parent + optional message
- [x] My Promotions page: list sent promotions with status (pending/enrolled/paid)
- [x] Earnings page: product promotion credits shown on My Promotions page

### Admin UI
- [x] Products management page (CRUD)
- [x] Product Promotions page: view all sent promotions
- [x] Product Enrollments page: confirm enrollment, trigger $25 credit (inline on promotions page)
- [x] Payouts page: product promotion credits managed via Product Promotions page

### Tests
- [x] Vitest tests for product promotion flow (12 tests, 81 total passing)

## Parent Email Notification on Product Promotion
- [x] Backend: send email to parent when promoter sends a product promotion
- [x] Email includes product name, description, price, category, and promoter name
- [x] Email includes a call-to-action message from the promoter (if provided)
- [x] Vitest tests for parent email notification on promotion send (2 tests, 83 total passing)
