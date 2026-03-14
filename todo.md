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

## Promoter Registration Email on Account Creation
- [x] Admin createPromoter sends styled welcome/registration email with setup link
- [x] Email includes promoter name, $50/$25 earnings table, 3-step guide, and CTA button
- [x] Setup link uses existing /setup/:token route (7-day expiry)
- [x] AccountSetup page polished: step banner, password strength meter, match indicator, icons
- [x] Vitest tests confirmed: 83 tests passing (no new tests needed, existing inviteAuth.test.ts covers this)

## Fix: Promoter Invitation Email Not Delivered
- [ ] Audit email helper (server/_core/email.ts) for correct API usage
- [ ] Audit createPromoter procedure for correct email call
- [ ] Check server logs for email errors
- [ ] Fix root cause and verify email delivery

## Fix: Gmail SMTP Email Integration
- [x] Root cause identified: Forge API SendEmail endpoint does not exist (404)
- [x] Installed nodemailer + @types/nodemailer
- [x] Stored GMAIL_USER and GMAIL_APP_PASSWORD as project secrets
- [x] Rewrote server/_core/email.ts to use Gmail SMTP via nodemailer
- [x] Added gmailUser and gmailAppPassword to ENV in env.ts
- [x] Live SMTP test confirmed: email delivered to arunemba@gmail.com
- [x] All 85 vitest tests passing (including live Gmail SMTP test)

## Product CRUD (Admin)
- [x] Backend: createProduct procedure (admin-only)
- [x] Backend: updateProduct procedure (admin-only)
- [x] Backend: deleteProduct procedure (admin-only)
- [x] Backend: getProductById procedure
- [x] Backend: listProducts procedure (all, with active filter)
- [x] Admin Products page: product table with name, category, price, status
- [x] Admin Products page: Create Product dialog (name, description, price, category)
- [x] Admin Products page: Edit Product dialog (pre-filled, with active toggle)
- [x] Admin Products page: Delete with AlertDialog confirmation
- [x] Admin Products page: Inline active/inactive quick-toggle switch per row
- [x] Admin Products page: Search, status filter tabs, category filter pills
- [x] Vitest tests for product CRUD role guards and validation (13 tests, 98 total passing)
- [x] Stats header (total, active, inactive counts)
- [x] View detail slide-over panel (Sheet) with metadata and quick actions
- [x] Result count footer on table

## Promotional Email Templates
### Database
- [x] promo_templates table (id, name, subject, htmlBody, textBody, createdAt, updatedAt)
- [x] products table: templateId FK column (nullable, one active template per product)

### Backend API
- [x] Admin: createTemplate procedure (name, subject, htmlBody, textBody)
- [x] Admin: updateTemplate procedure
- [x] Admin: deleteTemplate procedure
- [x] Admin: listTemplates procedure
- [x] Admin: getTemplateById procedure
- [x] Admin: associateTemplate procedure (link template to product)
- [x] Admin: getProductWithTemplate procedure
- [x] products.update: accepts templateId to set/clear template association
- [x] productPromotions.send: use product's associated template when sending email to parent
- [x] Template variable interpolation: {{promoterName}}, {{parentName}}, {{productName}}, {{productPrice}}, {{productDescription}}, {{productCategory}}, {{message}}

### Admin UI
- [x] Templates management page (/admin/promo-templates) with list, create, edit, delete
- [x] Rich template editor with subject line, HTML body (textarea), and variable hints (click-to-copy)
- [x] Live HTML preview panel (iframe renders template with sample data)
- [x] Associate template to product (Link2 button on template card → product dropdown)
- [x] Products page: template selector dropdown in create/edit dialogs
- [x] Products page: template name shown inline on product rows and in detail sheet
- [x] Sidebar nav: Promo Templates link added to admin menu

### Tests
- [x] Vitest tests for template CRUD and association (25 new tests, 123 total passing)

## Parent Enrollment Link in Promotion Email
- [x] DB: add enrollmentToken column to product_promotions table (unique, nanoid)
- [x] Backend: generate enrollmentToken when sending a product promotion
- [x] Backend: public resolveEnrollmentToken procedure (returns promotion + parent + product info)
- [x] Backend: public selfEnroll procedure (parent submits name/email → marks enrolled + notifies promoter)
- [x] Email: inject {{registrationLink}} variable into promotion email template
- [x] Email: plain-text fallback includes registration link
- [x] Email: prominent "Register & Enroll Now" CTA button in default template
- [x] Public enrollment landing page (/enroll/:token) — pre-fills parent info, shows product details, submit to confirm enrollment
- [x] Vitest tests for token generation, resolution, and enrollment confirmation (136 total passing)

## Multi-Parent Promotion Send
- [x] Backend: update productPromotions.send to accept parentIds (array) instead of single parentId
- [x] Backend: loop and create one promotion record + send one email per parent
- [x] Backend: partial failure handling (bad parents skipped, good ones still sent)
- [x] Frontend: replace single parent dropdown with multi-select checkbox list in Send Promotion dialog
- [x] Frontend: show selected count badge, select-all toggle, search/filter parents
- [x] Frontend: Send button label updates dynamically ("Send to N Parents")
- [x] Frontend: disable Send button when no parents selected
- [x] Vitest tests for multi-parent send (138 passing, emailSmtp excluded from count)

## Admin Referral Link Management
- [x] Backend: admin.setPromoterReferralToken procedure (custom token or auto-generate)
- [x] Backend: validate token uniqueness before saving (rejects conflict with other promoters)
- [x] Backend: validate token format (alphanumeric + hyphens/underscores, 4–32 chars)
- [x] Frontend: referral link section in Edit Promoter dialog (pre-fills existing token)
- [x] Frontend: copy-to-clipboard button shows full URL preview
- [x] Frontend: auto-generate button creates a random 12-char slug
- [x] Frontend: Save Link button (separate from Save Changes) with inline success/error feedback
- [x] Vitest tests: 11 tests for setPromoterReferralToken (149 total passing)

## Configurable Referral Fee
- [x] DB: app_settings table (key/value, upsert semantics)
- [x] DB: seed defaults (referralFee=$50, productReferralFee=$25)
- [x] Backend: admin.getSettings procedure
- [x] Backend: admin.updateReferralFee procedure (validates 0.01–10000)
- [x] Backend: admin.updateProductReferralFee procedure
- [x] Backend: replace hardcoded $50 in enrollStudent with dynamic getSetting(referralFee)
- [x] Backend: replace hardcoded $25 in confirmEnrollment with dynamic getSetting(productReferralFee)
- [x] Backend: replace hardcoded $25 in selfEnroll with dynamic getSetting(productReferralFee)
- [x] Backend: replace hardcoded multipliers in getPromoterEarningsSummary with stored creditAmount
- [x] Backend: replace hardcoded multipliers in getPromoterProductEarningsSummary with stored creditAmount
- [x] Admin UI: Settings page (/admin/settings) with two fee fields and Save buttons
- [x] Admin UI: Settings nav link in sidebar
- [x] Vitest tests: 11 tests for settings procedures (162 total passing)

## Per-Product Referral Fee Override
- [x] DB: add referralFeeOverride column to products table (decimal, nullable)
- [x] Backend: update createProduct and updateProduct db helpers to accept referralFeeOverride
- [x] Backend: update products.create and products.update tRPC procedures to accept referralFeeOverride
- [x] Backend: update confirmEnrollment to use product.referralFeeOverride if set, else global productReferralFee
- [x] Backend: update selfEnroll to use product.referralFeeOverride if set, else global productReferralFee
- [x] Admin UI: add Custom Referral Fee field to Create/Edit Product dialogs
- [x] Admin UI: show override fee badge on product table rows and detail sheet
- [x] Vitest tests: 9 new tests for fee override logic (169 total passing)
