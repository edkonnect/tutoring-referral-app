import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createParent,
  createPromoter,
  createReferral,
  createStudent,
  deleteParent,
  deletePromoter,
  deleteStudent,
  enrollStudent,
  getAllParents,
  getAllPromoters,
  getAllReferrals,
  getAllStudents,
  getParentById,
  getParentsByPromoter,
  getPromoterEarningsSummary,
  getPromoterReferralCount,
  getReferralByStudentId,
  getReferralsByPromoter,
  getStudentById,
  getStudentsByParent,
  getStudentsByPromoter,
  getUserById,
  getAllPromoterVisitStats,
  getReferralVisitStats,
  getUserByReferralToken,
  logReferralVisit,
  markReferralPaid,
  setReferralToken,
  updateParent,
  updatePromoter,
  updateStudent,
  createInvite,
  getInviteByToken,
  markInviteUsed,
  createCredentials,
  getCredentialsByEmail,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  sendProductPromotion,
  getProductPromotionsByPromoter,
  getAllProductPromotions,
  getProductPromotionById,
  confirmProductEnrollment,
  getProductEnrollmentsByPromoter,
  getAllProductEnrollments,
  getProductEnrollmentByPromotionId,
  markProductEnrollmentPaid,
  getPromoterProductEarningsSummary,
  getAllPromoTemplates,
  getPromoTemplateById,
  createPromoTemplate,
  updatePromoTemplate,
  deletePromoTemplate,
  associateTemplateToProduct,
  getProductWithTemplate,
  getPromotionByEnrollmentToken,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sendEmail } from "./_core/email";
import { sdk } from "./_core/sdk";

// ─── Role-based middleware ────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const promoterProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "promoter" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Promoter access required" });
  }
  return next({ ctx });
});

// ─── Parents Router ───────────────────────────────────────────────────────────

const parentsRouter = router({
  list: promoterProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return getAllParents();
    return getParentsByPromoter(ctx.user.id);
  }),

  listAll: adminProcedure.query(() => getAllParents()),

  create: promoterProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createParent({ ...input, promoterId: ctx.user.id });
      return { success: true };
    }),

  update: promoterProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const parent = await getParentById(input.id);
      if (!parent) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin" && parent.promoterId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      await updateParent(id, data);
      return { success: true };
    }),

  delete: promoterProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const parent = await getParentById(input.id);
      if (!parent) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin" && parent.promoterId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteParent(input.id);
      return { success: true };
    }),
});

// ─── Students Router ──────────────────────────────────────────────────────────

const studentsRouter = router({
  listByParent: promoterProcedure
    .input(z.object({ parentId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const parent = await getParentById(input.parentId);
        if (!parent || parent.promoterId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return getStudentsByParent(input.parentId);
    }),

  listAll: adminProcedure.query(() => getAllStudents()),

  listByPromoter: promoterProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return getAllStudents();
    return getStudentsByPromoter(ctx.user.id);
  }),

  create: promoterProcedure
    .input(
      z.object({
        parentId: z.number(),
        name: z.string().min(1),
        age: z.number().min(1).max(25).optional(),
        gradeLevel: z.string().optional(),
        subjects: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const parent = await getParentById(input.parentId);
        if (!parent || parent.promoterId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await createStudent(input);
      return { success: true };
    }),

  update: promoterProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        age: z.number().min(1).max(25).optional(),
        gradeLevel: z.string().optional(),
        subjects: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const student = await getStudentById(input.id);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin") {
        const parent = await getParentById(student.parentId);
        if (!parent || parent.promoterId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      const { id, ...data } = input;
      await updateStudent(id, data);
      return { success: true };
    }),

  delete: promoterProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudentById(input.id);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin") {
        const parent = await getParentById(student.parentId);
        if (!parent || parent.promoterId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await deleteStudent(input.id);
      return { success: true };
    }),

  // Admin-only: confirm enrollment and trigger $50 credit + email
  enroll: adminProcedure
    .input(z.object({ studentId: z.number() }))
    .mutation(async ({ input }) => {
      const student = await getStudentById(input.studentId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });
      if (student.enrolled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Student is already enrolled" });
      }

      const parent = await getParentById(student.parentId);
      if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent not found" });

      // Mark student as enrolled
      await enrollStudent(student.id);

      // Create referral credit record
      await createReferral({
        promoterId: parent.promoterId,
        parentId: parent.id,
        studentId: student.id,
      });

      // Fetch promoter info for email
      const promoter = await getUserById(parent.promoterId);

      // Send email notification to promoter
      if (promoter?.email) {
        try {
          await sendEmail({
            to: promoter.email,
            subject: `Great news! Your referral earned you $50 — ${student.name} is now enrolled`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="color: #fff; margin: 0; font-size: 24px;">Referral Credit Earned!</h1>
                </div>
                <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                  <p style="font-size: 16px;">Hi <strong>${promoter.name || "Promoter"}</strong>,</p>
                  <p style="font-size: 16px;">Congratulations! Your referral has been confirmed. <strong>${student.name}</strong> has been enrolled in our tutoring program.</p>
                  <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af;">Referral Credit</p>
                    <p style="margin: 8px 0 0; font-size: 36px; font-weight: bold; color: #1e40af;">$50.00</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #3b82f6;">Status: Pending Payout</p>
                  </div>
                  <p style="font-size: 14px; color: #6b7280;">Parent referred: <strong>${parent.name}</strong></p>
                  <p style="font-size: 14px; color: #6b7280;">Student enrolled: <strong>${student.name}</strong></p>
                  <p style="font-size: 14px; color: #6b7280;">Your $50 referral fee will be processed shortly. You can track your earnings in your promoter dashboard.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #9ca3af; text-align: center;">Tutoring Referral Manager &mdash; Thank you for growing our community!</p>
                </div>
              </div>
            `,
          });
        } catch (err) {
          console.error("[Email] Failed to send enrollment notification:", err);
          // Don't fail the enrollment if email fails
        }
      }

      return { success: true, promoterEmail: promoter?.email };
    }),
});

// ─── Referrals Router ─────────────────────────────────────────────────────────

const referralsRouter = router({
  myReferrals: promoterProcedure.query(async ({ ctx }) => {
    return getReferralsByPromoter(ctx.user.id);
  }),

  myEarnings: promoterProcedure.query(async ({ ctx }) => {
    return getPromoterEarningsSummary(ctx.user.id);
  }),

  listAll: adminProcedure.query(() => getAllReferrals()),

  markPaid: adminProcedure
    .input(z.object({ referralId: z.number() }))
    .mutation(async ({ input }) => {
      await markReferralPaid(input.referralId);
      return { success: true };
    }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────

const adminRouter = router({
  listPromoters: adminProcedure.query(() => getAllPromoters()),

  createPromoter: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        origin: z.string().optional(), // frontend passes window.location.origin
      })
    )
    .mutation(async ({ input, ctx }) => {
      await createPromoter({ name: input.name, email: input.email });
      // Get the newly created user
      const allPromoters = await getAllPromoters();
      const newPromoter = allPromoters.find((p) => p.email === input.email);
      if (!newPromoter) return { success: true };

      // Generate invite token (expires in 7 days)
      const { nanoid } = await import("nanoid");
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createInvite(newPromoter.id, token, expiresAt);

      // Build setup URL
      const origin =
        input.origin ||
        (ctx.req.headers["x-forwarded-host"]
          ? `https://${ctx.req.headers["x-forwarded-host"]}`
          : `${ctx.req.protocol}://${ctx.req.headers.host}`);
      const setupUrl = `${origin}/setup/${token}`;

      // Send registration/welcome email
      try {
        await sendEmail({
          to: input.email,
          subject: `Welcome! Set up your Tutoring Referral Program account`,
          text: `Hi ${input.name},\n\nYou have been added as a promoter for the Tutoring Referral Program. Click the link below to create your account and set your password:\n\n${setupUrl}\n\nThis link expires in 7 days.\n\nOnce your account is active you can start referring parents and earning $50 for every student who enrolls.`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:36px 40px 28px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;padding:14px;margin-bottom:14px;">
        <span style="font-size:32px;">&#127891;</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">You're Invited!</h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:15px;">Tutoring Referral Program</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <p style="margin:0 0 12px;color:#0f172a;font-size:16px;">Hi <strong>${input.name}</strong>,</p>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">You have been added as a <strong>Promoter</strong> for our tutoring referral program. Create your account to access your personal dashboard and start earning referral credits.</p>
      <!-- Earnings highlight -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:28px;font-weight:800;color:#1d4ed8;">$50</div>
              <div style="font-size:12px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Per Student Enrolled</div>
            </td>
            <td style="width:1px;background:#bfdbfe;"></td>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:28px;font-weight:800;color:#1d4ed8;">$25</div>
              <div style="font-size:12px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Per Product Enrolled</div>
            </td>
          </tr>
        </table>
      </div>
      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${setupUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#ffffff;padding:15px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(37,99,235,0.35);">Create My Account &rarr;</a>
      </div>
      <!-- Steps -->
      <div style="background:#f8fafc;border-radius:10px;padding:18px 22px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Getting Started</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;vertical-align:top;"><span style="display:inline-block;background:#2563eb;color:#fff;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:10px;">1</span></td><td style="padding:5px 0;color:#475569;font-size:14px;">Click the button above to create your account</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;"><span style="display:inline-block;background:#2563eb;color:#fff;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:10px;">2</span></td><td style="padding:5px 0;color:#475569;font-size:14px;">Set your email address and password</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;"><span style="display:inline-block;background:#2563eb;color:#fff;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:10px;">3</span></td><td style="padding:5px 0;color:#475569;font-size:14px;">Add parents &amp; students and track your earnings</td></tr>
        </table>
      </div>
      <!-- Fallback link -->
      <p style="font-size:12px;color:#94a3b8;margin:0;">Can't click the button? Copy this link into your browser:<br/><a href="${setupUrl}" style="color:#2563eb;word-break:break-all;">${setupUrl}</a></p>
    </div>
    <!-- Footer -->
    <div style="background:#f1f5f9;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Tutoring Referral Manager</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;">This invitation link expires in <strong>7 days</strong>. If you did not expect this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`,
        });
      } catch (err) {
        console.error("[Email] Failed to send registration email:", err);
      }

      return { success: true };
    }),

  resendInvite: adminProcedure
    .input(z.object({ promoterId: z.number(), origin: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const promoter = await getUserById(input.promoterId);
      if (!promoter || promoter.role !== "promoter") throw new TRPCError({ code: "NOT_FOUND" });
      if (!promoter.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Promoter has no email" });

      const { nanoid } = await import("nanoid");
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createInvite(promoter.id, token, expiresAt);

      const origin =
        input.origin ||
        (ctx.req.headers["x-forwarded-host"]
          ? `https://${ctx.req.headers["x-forwarded-host"]}`
          : `${ctx.req.protocol}://${ctx.req.headers.host}`);
      const setupUrl = `${origin}/setup/${token}`;

      await sendEmail({
        to: promoter.email,
        subject: `Your account setup link for the Tutoring Referral Program`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">Account Setup Link</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px;">Hi <strong>${promoter.name || "Promoter"}</strong>,</p>
              <p style="font-size: 16px;">Here is your new account setup link. Click the button below to set your password and access your promoter dashboard.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${setupUrl}" style="background: #1e40af; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">Set Up My Account</a>
              </div>
              <p style="font-size: 13px; color: #6b7280;">This link expires in <strong>7 days</strong>.</p>
            </div>
          </div>
        `,
      });

      return { success: true };
    }),

  updatePromoter: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePromoter(id, data);
      return { success: true };
    }),

  deletePromoter: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const referralCount = await getPromoterReferralCount(input.id);
      if (referralCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete promoter with ${referralCount} active referral(s). Remove their referrals first.`,
        });
      }
      await deletePromoter(input.id);
      return { success: true };
    }),

  getPromoterById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const promoter = await getUserById(input.id);
      if (!promoter || promoter.role !== "promoter") throw new TRPCError({ code: "NOT_FOUND" });
      return promoter;
    }),

  getStats: adminProcedure.query(async () => {
    const [allPromoters, allParents, allStudents, allReferrals] = await Promise.all([
      getAllPromoters(),
      getAllParents(),
      getAllStudents(),
      getAllReferrals(),
    ]);
    const enrolled = allStudents.filter((s) => s.enrolled).length;
    const pendingReferrals = allReferrals.filter((r) => r.status === "pending").length;
    const paidReferrals = allReferrals.filter((r) => r.status === "paid").length;
    return {
      totalPromoters: allPromoters.length,
      totalParents: allParents.length,
      totalStudents: allStudents.length,
      enrolledStudents: enrolled,
      pendingReferrals,
      paidReferrals,
      totalCreditsIssued: allReferrals.length * 50,
      pendingPayouts: pendingReferrals * 50,
    };
  }),
});

// ─── Referral Link Router ────────────────────────────────────────────────────

const referralLinkRouter = router({
  // Get or generate a referral token for the logged-in promoter
  getMyToken: promoterProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    if (user.referralToken) return { token: user.referralToken };
    // Generate a new unique token using nanoid-style random string
    const { nanoid } = await import("nanoid");
    const token = nanoid(16);
    await setReferralToken(ctx.user.id, token);
    return { token };
  }),

  // Regenerate token (invalidates old link)
  regenerateToken: promoterProcedure.mutation(async ({ ctx }) => {
    const { nanoid } = await import("nanoid");
    const token = nanoid(16);
    await setReferralToken(ctx.user.id, token);
    return { token };
  }),

  // Public: resolve a token to promoter info (for the registration page)
  resolveToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const promoter = await getUserByReferralToken(input.token);
      if (!promoter) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral link" });
      return {
        promoterId: promoter.id,
        promoterName: promoter.name ?? "Your Promoter",
      };
    }),

  // Public: log a visit to a referral link page
  logVisit: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const promoter = await getUserByReferralToken(input.token);
      if (!promoter) return { success: false };
      const userAgent = (ctx.req.headers["user-agent"] as string | undefined) ?? undefined;
      const forwarded = ctx.req.headers["x-forwarded-for"] as string | undefined;
      const ipAddress = forwarded ? forwarded.split(",")[0]?.trim() : (ctx.req.socket?.remoteAddress ?? undefined);
      await logReferralVisit({ promoterId: promoter.id, userAgent, ipAddress });
      return { success: true };
    }),

  // Promoter: get visit stats for own referral link
  getVisitStats: promoterProcedure.query(async ({ ctx }) => {
    return getReferralVisitStats(ctx.user.id);
  }),

  // Admin: get visit stats for all promoters
  getAllVisitStats: adminProcedure.query(async () => {
    return getAllPromoterVisitStats();
  }),

  // Public: register a parent via a referral link (no auth required)
  registerParent: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email required"),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const promoter = await getUserByReferralToken(input.token);
      if (!promoter) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral link" });
      const { token, ...parentData } = input;
      await createParent({ ...parentData, promoterId: promoter.id });
      return { success: true, promoterName: promoter.name ?? "Your Promoter" };
    }),
});

// ─── Promoter Router ──────────────────────────────────────────────────────────

const promoterRouter = router({
  getStats: promoterProcedure.query(async ({ ctx }) => {
    const [myParents, myStudents, earnings] = await Promise.all([
      getParentsByPromoter(ctx.user.id),
      getStudentsByPromoter(ctx.user.id),
      getPromoterEarningsSummary(ctx.user.id),
    ]);
    return {
      totalParents: myParents.length,
      totalStudents: myStudents.length,
      enrolledStudents: myStudents.filter((s) => s.enrolled).length,
      ...earnings,
    };
  }),
});

// ─── Invite / Credentials Router ─────────────────────────────────────────────

const inviteRouter = router({
  // Public: resolve an invite token to see promoter name (for the setup page)
  resolve: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await getInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invite link" });
      if (invite.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has already been used" });
      if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite link has expired" });
      const promoter = await getUserById(invite.userId);
      if (!promoter) throw new TRPCError({ code: "NOT_FOUND" });
      return { name: promoter.name ?? "", email: promoter.email ?? "" };
    }),

  // Public: set up account (choose email + password) via invite token
  setupAccount: publicProcedure
    .input(
      z.object({
        token: z.string(),
        email: z.string().email("Valid email required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const invite = await getInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invite link" });
      if (invite.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has already been used" });
      if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite link has expired" });

      // Check email not already taken
      const existing = await getCredentialsByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This email is already in use" });

      // Hash password and store credentials
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(input.password, 12);
      await createCredentials(invite.userId, input.email, passwordHash);
      await markInviteUsed(invite.id);

      // Auto-login: create a session cookie
      const promoter = await getUserById(invite.userId);
      if (!promoter) throw new TRPCError({ code: "NOT_FOUND" });

      const sessionToken = await sdk.createSessionToken(promoter.openId, { name: promoter.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });

      return { success: true, name: promoter.name ?? "" };
    }),

  // Public: email/password login for promoters
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const creds = await getCredentialsByEmail(input.email);
      if (!creds) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(input.password, creds.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });

      const promoter = await getUserById(creds.userId);
      if (!promoter) throw new TRPCError({ code: "NOT_FOUND" });

      const sessionToken = await sdk.createSessionToken(promoter.openId, { name: promoter.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });

      return { success: true, role: promoter.role, name: promoter.name ?? "" };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

// ─── Products Router (admin manages, promoters browse) ────────────────────────────

const productsRouter = router({
  list: promoterProcedure.query(async ({ ctx }) => {
    // Admins see all products; promoters see only active ones
    return getAllProducts(ctx.user.role !== "admin");
  }),

  listAll: adminProcedure.query(() => getAllProducts(false)),

  getById: promoterProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const product = await getProductById(input.id);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return product;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        price: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createProduct(input);
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        category: z.string().optional(),
        active: z.boolean().optional(),
        templateId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProduct(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProduct(input.id);
      return { success: true };
    }),
});

// ─── Product Promotions Router ─────────────────────────────────────────────────────

const productPromotionsRouter = router({
  // Promoter sends a product promotion to a parent
  send: promoterProcedure
    .input(
      z.object({
        parentId: z.number(),
        productId: z.number(),
        message: z.string().optional(),
        origin: z.string().url().optional().default("https://app.example.com"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const promoterId = ctx.user.id;

      // Verify the parent belongs to this promoter (or admin)
      const parent = await getParentById(input.parentId);
      if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent not found" });
      if (ctx.user.role !== "admin" && parent.promoterId !== promoterId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Parent does not belong to you" });
      }

      // Verify product exists and is active
      const product = await getProductById(input.productId);
      if (!product || !product.active) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found or inactive" });

      // Generate a unique enrollment token for this promotion
      const { nanoid } = await import("nanoid");
      const enrollmentToken = nanoid(32);

      await sendProductPromotion({ promoterId, parentId: input.parentId, productId: input.productId, message: input.message, enrollmentToken });

      // Build the registration link — frontend passes its origin so the URL is always correct
      const registrationLink = `${input.origin}/enroll/${enrollmentToken}`;

      // Email the parent — use associated template if available, else fall back to default
      if (parent.email) {
        const promoterName = ctx.user.name ?? "Your referrer";
        const priceDisplay = product.price ? `$${parseFloat(product.price).toFixed(2)}` : "Contact us for pricing";

        // Fetch the product's associated template
        const productWithTemplate = await getProductWithTemplate(input.productId);
        const template = productWithTemplate?.template;

        let emailSubject: string;
        let emailHtml: string;
        let emailText: string | undefined;

        if (template) {
          // Interpolate template variables (including registrationLink)
          const vars: Record<string, string> = {
            promoterName,
            parentName: parent.name,
            productName: product.name,
            productPrice: priceDisplay,
            productDescription: product.description ?? "",
            productCategory: product.category ?? "",
            message: input.message ?? "",
            registrationLink,
          };
          const interpolate = (str: string) =>
            str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

          emailSubject = interpolate(template.subject);
          emailHtml = interpolate(template.htmlBody);
          emailText = template.textBody ? interpolate(template.textBody) : undefined;
        } else {
          // Default built-in template
          const categoryDisplay = product.category
            ? `<span style="display:inline-block;background:#e0f2fe;color:#0369a1;padding:2px 10px;border-radius:12px;font-size:13px;">${product.category}</span>`
            : "";
          const messageSection = input.message
            ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0;font-style:italic;color:#166534;">&ldquo;${input.message}&rdquo;</p>
                <p style="margin:6px 0 0;font-size:12px;color:#4ade80;">— ${promoterName}</p>
               </div>`
            : "";
          const descSection = product.description
            ? `<p style="color:#475569;line-height:1.6;">${product.description}</p>`
            : "";

          emailSubject = `${promoterName} shared a tutoring program with you: ${product.name}`;
          emailText = `Hi ${parent.name},\n\n${promoterName} thought you might be interested in our ${product.name} program.\n\n${product.description ?? ""}\n\nPrice: ${priceDisplay}\n\n${input.message ? `Message from ${promoterName}: "${input.message}"` : ""}\n\nRegister now to enroll your child:\n${registrationLink}`;
          emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">A Program Just for You</h1>
      <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">${promoterName} thought you'd be interested</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hi <strong>${parent.name}</strong>,</p>
      <p style="margin:0 0 20px;color:#475569;"><strong>${promoterName}</strong> has shared a tutoring program with you that may be a great fit for your family.</p>
      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#f1f5f9;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
          <h2 style="margin:0;color:#0f172a;font-size:18px;font-weight:700;">${product.name}</h2>
          ${categoryDisplay ? `<div style="margin-top:8px;">${categoryDisplay}</div>` : ""}
        </div>
        <div style="padding:16px 20px;">
          ${descSection}
          <div style="margin-top:12px;"><span style="font-size:22px;font-weight:700;color:#1e40af;">${priceDisplay}</span></div>
        </div>
      </div>
      ${messageSection}
      <div style="text-align:center;margin:24px 0;">
        <a href="${registrationLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:700;">Register &amp; Enroll Now</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;">Or copy this link: <a href="${registrationLink}" style="color:#3b82f6;">${registrationLink}</a></p>
    </div>
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">You received this email because ${promoterName} referred you to our tutoring program.</p>
    </div>
  </div>
</body>
</html>`;
        }

        await sendEmail({ to: parent.email, subject: emailSubject, html: emailHtml, text: emailText });
      }

      return { success: true };
    }),

  // Promoter views their own sent promotions
  myList: promoterProcedure.query(async ({ ctx }) => {
    const promotions = await getProductPromotionsByPromoter(ctx.user.id);
    // Enrich with product and parent info
    const enriched = await Promise.all(
      promotions.map(async (promo) => {
        const [product, parent, enrollment] = await Promise.all([
          getProductById(promo.productId),
          getParentById(promo.parentId),
          getProductEnrollmentByPromotionId(promo.id),
        ]);
        return { ...promo, product, parent, enrollment };
      })
    );
    return enriched;
  }),

  // Admin views all sent promotions
  listAll: adminProcedure.query(async () => {
    const promotions = await getAllProductPromotions();
    const enriched = await Promise.all(
      promotions.map(async (promo) => {
        const [product, parent, promoter, enrollment] = await Promise.all([
          getProductById(promo.productId),
          getParentById(promo.parentId),
          getUserById(promo.promoterId),
          getProductEnrollmentByPromotionId(promo.id),
        ]);
        return { ...promo, product, parent, promoter, enrollment };
      })
    );
    return enriched;
  }),

  // Admin confirms a parent enrolled in a promoted product → $25 credit
  confirmEnrollment: adminProcedure
    .input(z.object({ promotionId: z.number() }))
    .mutation(async ({ input }) => {
      const promotion = await getProductPromotionById(input.promotionId);
      if (!promotion) throw new TRPCError({ code: "NOT_FOUND", message: "Promotion not found" });

      // Check not already enrolled
      const existing = await getProductEnrollmentByPromotionId(input.promotionId);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already enrolled for this promotion" });

      // Create the $25 credit record
      await confirmProductEnrollment({
        promotionId: promotion.id,
        promoterId: promotion.promoterId,
        parentId: promotion.parentId,
        productId: promotion.productId,
      });

      // Notify the promoter via email
      const [promoter, product, parent] = await Promise.all([
        getUserById(promotion.promoterId),
        getProductById(promotion.productId),
        getParentById(promotion.parentId),
      ]);

      if (promoter?.email && product && parent) {
        await sendEmail({
          to: promoter.email,
          subject: `🎉 Product Enrollment Confirmed — $25 Credit Earned!`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#2563eb;">Great news, ${promoter.name || "Promoter"}!</h2>
              <p>Your referred parent <strong>${parent.name}</strong> has enrolled in <strong>${product.name}</strong>.</p>
              <p>A <strong>$25.00 referral credit</strong> has been added to your account.</p>
              <p style="color:#6b7280;font-size:0.875rem;">Log in to your dashboard to view your earnings and payout status.</p>
            </div>
          `,
        });
      }

      return { success: true };
    }),

  // Admin marks a product enrollment credit as paid
  markPaid: adminProcedure
    .input(z.object({ enrollmentId: z.number() }))
    .mutation(async ({ input }) => {
      await markProductEnrollmentPaid(input.enrollmentId);
      return { success: true };
    }),

  // Admin lists all product enrollment credits (for payout management)
  listEnrollments: adminProcedure.query(() => getAllProductEnrollments()),

  // Public: resolve an enrollment token → returns promotion details for the landing page
  resolveEnrollmentToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const promotion = await getPromotionByEnrollmentToken(input.token);
      if (!promotion) throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment link not found or expired" });

      const [product, parent, promoter, enrollment] = await Promise.all([
        getProductById(promotion.productId),
        getParentById(promotion.parentId),
        getUserById(promotion.promoterId),
        getProductEnrollmentByPromotionId(promotion.id),
      ]);

      return {
        promotionId: promotion.id,
        alreadyEnrolled: !!enrollment,
        product: product ? {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
        } : null,
        parent: parent ? {
          name: parent.name,
          email: parent.email,
        } : null,
        promoterName: promoter?.name ?? null,
      };
    }),

  // Public: parent self-enrolls via the enrollment link
  selfEnroll: publicProcedure
    .input(z.object({
      token: z.string(),
      parentName: z.string().min(1, "Name is required"),
      parentEmail: z.string().email("Valid email is required"),
    }))
    .mutation(async ({ input }) => {
      const promotion = await getPromotionByEnrollmentToken(input.token);
      if (!promotion) throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment link not found or expired" });

      // Check not already enrolled
      const existing = await getProductEnrollmentByPromotionId(promotion.id);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "You have already enrolled in this program" });

      // Update parent info if provided (they may have a different name/email)
      await updateParent(promotion.parentId, { name: input.parentName, email: input.parentEmail });

      // Create the enrollment record ($25 credit for promoter)
      await confirmProductEnrollment({
        promotionId: promotion.id,
        promoterId: promotion.promoterId,
        parentId: promotion.parentId,
        productId: promotion.productId,
      });

      // Notify the promoter
      const [promoter, product, parent] = await Promise.all([
        getUserById(promotion.promoterId),
        getProductById(promotion.productId),
        getParentById(promotion.parentId),
      ]);

      if (promoter?.email && product && parent) {
        try {
          await sendEmail({
            to: promoter.email,
            subject: `🎉 ${input.parentName} just enrolled in ${product.name}!`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                <h2 style="color:#2563eb;">Great news, ${promoter.name || "Promoter"}!</h2>
                <p><strong>${input.parentName}</strong> has enrolled in <strong>${product.name}</strong> using your referral link.</p>
                <p>A <strong>$25.00 referral credit</strong> has been added to your account.</p>
                <p style="color:#6b7280;font-size:0.875rem;">Log in to your dashboard to view your earnings and payout status.</p>
              </div>
            `,
            text: `Great news! ${input.parentName} has enrolled in ${product.name} using your referral link. A $25.00 referral credit has been added to your account.`,
          });
        } catch (err) {
          console.error("[Email] Failed to notify promoter on self-enrollment:", err);
        }
      }

      return { success: true };
    }),

  // Promoter views their own product enrollment credits
  myEarnings: promoterProcedure.query(async ({ ctx }) => {
    const [enrollments, summary] = await Promise.all([
      getProductEnrollmentsByPromoter(ctx.user.id),
      getPromoterProductEarningsSummary(ctx.user.id),
    ]);
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const [product, parent] = await Promise.all([
          getProductById(e.productId),
          getParentById(e.parentId),
        ]);
        return { ...e, product, parent };
      })
    );
    return { enrollments: enriched, summary };
  }),
});

// ─── Promo Templates Router ─────────────────────────────────────────────────

const promoTemplatesRouter = router({
  // List all templates
  list: adminProcedure.query(() => getAllPromoTemplates()),

  // Get single template by id
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const t = await getPromoTemplateById(input.id);
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return t;
    }),

  // Create a new template
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        htmlBody: z.string().min(1),
        textBody: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createPromoTemplate(input);
      return { success: true };
    }),

  // Update an existing template
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        htmlBody: z.string().min(1).optional(),
        textBody: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePromoTemplate(id, data);
      return { success: true };
    }),

  // Delete a template (also detaches from products)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePromoTemplate(input.id);
      return { success: true };
    }),

  // Associate a template with a product (or remove association with null)
  associate: adminProcedure
    .input(z.object({ productId: z.number(), templateId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      await associateTemplateToProduct(input.productId, input.templateId);
      return { success: true };
    }),

  // Get a product with its associated template
  getProductWithTemplate: adminProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => getProductWithTemplate(input.productId)),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  parents: parentsRouter,
  students: studentsRouter,
  referrals: referralsRouter,
  admin: adminRouter,
  promoter: promoterRouter,
  referralLink: referralLinkRouter,
  invite: inviteRouter,
  products: productsRouter,
  productPromotions: productPromotionsRouter,
  promoTemplates: promoTemplatesRouter,
});

export type AppRouter = typeof appRouter;
