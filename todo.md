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
