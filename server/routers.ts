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
  getUserByEmail,
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
  upsertPromoterProfile,
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
  getAllSettings,
  createPromoCode,
  getPromoCodesByParent,
  getPromoCodesByPromoter,
  getPromoCodeByPromotion,
  upsertSetting,
  getSetting,
  SETTING_KEYS,
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

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function resolveAppOrigin(
  ctx: { req: { headers: Record<string, unknown>; protocol?: string; }; },
  origin?: string
) {
  if (origin) return origin;

  const forwardedHost = ctx.req.headers["x-forwarded-host"];
  if (typeof forwardedHost === "string" && forwardedHost.length > 0) {
    return `https://${forwardedHost}`;
  }

  const host = ctx.req.headers.host;
  if (typeof host === "string" && host.length > 0) {
    return `${ctx.req.protocol ?? "http"}://${host}`;
  }

  return "http://localhost:3001";
}

function buildPromoterSetupEmail(args: {
  promoterName: string;
  setupUrl: string;
  variant: "invite" | "signup" | "resend";
}) {
  const { promoterName, setupUrl, variant } = args;

  const copy =
    variant === "signup"
      ? {
          subject: "Complete your Tutoring Referral Program signup",
          title: "Finish Your Signup",
          intro:
            "Thanks for signing up to become a promoter. Use the link below to create your password and activate your account.",
          buttonLabel: "Create My Password",
        }
      : variant === "resend"
        ? {
            subject: "Your updated Tutoring Referral Program setup link",
            title: "Your Setup Link",
            intro:
              "Here is your new account setup link. Use it to create your password and access your promoter dashboard.",
            buttonLabel: "Set Up My Account",
          }
        : {
            subject: "Welcome! Set up your Tutoring Referral Program account",
            title: "You're Invited",
            intro:
              "You have been added as a promoter for our tutoring referral program. Create your account to access your dashboard and start earning referral credits.",
            buttonLabel: "Create My Account",
          };

  return {
    subject: copy.subject,
    text: `Hi ${promoterName},\n\n${copy.intro}\n\n${setupUrl}\n\nThis link expires in 7 days.`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:36px 40px 28px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;padding:14px;margin-bottom:14px;">
        <span style="font-size:32px;">&#127891;</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;">${copy.title}</h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:15px;">Tutoring Referral Program</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="margin:0 0 12px;color:#0f172a;font-size:16px;">Hi <strong>${promoterName}</strong>,</p>
      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">${copy.intro}</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:18px 22px;margin-bottom:24px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#1d4ed8;">$50</div>
        <div style="font-size:12px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Per Student Enrolled</div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${setupUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#ffffff;padding:15px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(37,99,235,0.35);">${copy.buttonLabel} &rarr;</a>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:0;">Can't click the button? Copy this link into your browser:<br/><a href="${setupUrl}" style="color:#2563eb;word-break:break-all;">${setupUrl}</a></p>
    </div>
    <div style="background:#f1f5f9;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Tutoring Referral Manager</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;">This link expires in <strong>7 days</strong>.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

async function issuePromoterSetupInvite(args: {
  userId: number;
  promoterName: string;
  email: string;
  ctx: { req: { headers: Record<string, unknown>; protocol?: string; }; };
  origin?: string;
  variant: "invite" | "signup" | "resend";
}) {
  const { nanoid } = await import("nanoid");
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
  await createInvite(args.userId, token, expiresAt);

  const setupUrl = `${resolveAppOrigin(args.ctx, args.origin)}/setup/${token}`;
  const emailPayload = buildPromoterSetupEmail({
    promoterName: args.promoterName,
    setupUrl,
    variant: args.variant,
  });
  const sent = await sendEmail({
    to: args.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
  });

  return { sent, setupUrl };
}

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
        lastName: z.string().optional(),
        age: z.number().min(1).max(25).optional(),
        gradeLevel: z.string().optional(),
        subjects: z.string().optional(),
        educationGoals: z.string().optional(),
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

  // Admin-only: confirm enrollment and trigger referral credit + email
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
      // Fetch current referral fee from settings
      const referralFee = await getSetting(SETTING_KEYS.referralFee);
      // Mark student as enrolled
      await enrollStudent(student.id);
      // Create referral credit record (creditAmount stored for historical accuracy)
      await createReferral({
        promoterId: parent.promoterId,
        parentId: parent.id,
        studentId: student.id,
        creditAmount: referralFee.toFixed(2),
      });;

      // Fetch promoter info for email
      const promoter = await getUserById(parent.promoterId);

      // Send email notification to promoter
      if (promoter?.email) {
        try {
          await sendEmail({
            to: promoter.email,
            subject: `Great news! Your referral earned you $${referralFee.toFixed(2)} — ${student.name} is now enrolled`,
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
                    <p style="margin: 8px 0 0; font-size: 36px; font-weight: bold; color: #1e40af;">$${referralFee.toFixed(2)}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #3b82f6;">Status: Pending Payout</p>
                  </div>
                  <p style="font-size: 14px; color: #6b7280;">Parent referred: <strong>${parent.name}</strong></p>
                  <p style="font-size: 14px; color: #6b7280;">Student enrolled: <strong>${student.name}</strong></p>
                  <p style="font-size: 14px; color: #6b7280;">Your $${referralFee.toFixed(2)} referral fee will be processed shortly. You can track your earnings in your promoter dashboard.</p>
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
      const newPromoter = await getUserByEmail(input.email);
      if (!newPromoter) return { success: true };

      const { sent } = await issuePromoterSetupInvite({
        userId: newPromoter.id,
        promoterName: input.name,
        email: input.email,
        ctx,
        origin: input.origin,
        variant: "invite",
      });
      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to send the setup email right now. Please verify email settings and try again.",
        });
      }

      return { success: true };
    }),

  resendInvite: adminProcedure
    .input(z.object({ promoterId: z.number(), origin: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const promoter = await getUserById(input.promoterId);
      if (!promoter || promoter.role !== "promoter") throw new TRPCError({ code: "NOT_FOUND" });
      if (!promoter.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Promoter has no email" });

      const { sent } = await issuePromoterSetupInvite({
        userId: promoter.id,
        promoterName: promoter.name || "Promoter",
        email: promoter.email,
        ctx,
        origin: input.origin,
        variant: "resend",
      });
      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to resend the setup email right now. Please verify email settings and try again.",
        });
      }

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

  setPromoterReferralToken: adminProcedure
    .input(
      z.object({
        promoterId: z.number(),
        // token is optional: if omitted, a new one is auto-generated
        token: z
          .string()
          .regex(/^[a-zA-Z0-9_-]+$/, "Token may only contain letters, numbers, hyphens, and underscores")
          .min(4, "Token must be at least 4 characters")
          .max(32, "Token must be at most 32 characters")
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const promoter = await getUserById(input.promoterId);
      if (!promoter || promoter.role !== "promoter")
        throw new TRPCError({ code: "NOT_FOUND", message: "Promoter not found" });

      let finalToken: string;
      if (input.token) {
        // Check uniqueness — reject if another promoter already uses this token
        const existing = await getUserByReferralToken(input.token);
        if (existing && existing.id !== input.promoterId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This referral token is already in use by another promoter. Please choose a different one.",
          });
        }
        finalToken = input.token;
      } else {
        // Auto-generate a unique token
        const { nanoid } = await import("nanoid");
        let candidate: string;
        let attempts = 0;
        do {
          candidate = nanoid(16);
          const conflict = await getUserByReferralToken(candidate);
          if (!conflict) break;
          attempts++;
        } while (attempts < 10);
        finalToken = candidate!;
      }

      await setReferralToken(input.promoterId, finalToken);
      return { success: true, token: finalToken };
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
    const referralFee = await getSetting(SETTING_KEYS.referralFee);
    return {
      totalPromoters: allPromoters.length,
      totalParents: allParents.length,
      totalStudents: allStudents.length,
      enrolledStudents: enrolled,
      pendingReferrals,
      paidReferrals,
      referralFee,
      totalCreditsIssued: allReferrals.length * referralFee,
      pendingPayouts: pendingReferrals * referralFee,
    };
  }),

  // ── Settings ──
  getSettings: adminProcedure.query(async () => {
    return getAllSettings();
  }),

  updateReferralFee: adminProcedure
    .input(
      z.object({
        fee: z.number().positive("Fee must be a positive number").max(10000, "Fee cannot exceed $10,000"),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSetting(SETTING_KEYS.referralFee, input.fee.toFixed(2));
      return { success: true, fee: input.fee };
    }),

  updateProductReferralFee: adminProcedure
    .input(
      z.object({
        fee: z.number().positive("Fee must be a positive number").max(10000, "Fee cannot exceed $10,000"),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSetting(SETTING_KEYS.productReferralFee, input.fee.toFixed(2));
      return { success: true, fee: input.fee };
    }),
});
// ─── Referral Link Router ──────────────────────────────────────────────────────────────

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
  register: publicProcedure
    .input(
      z.object({
        firstName: z.string().trim().min(1, "First name is required").max(255),
        lastName: z.string().trim().min(1, "Last name is required").max(255),
        email: z.string().trim().email("Valid email required"),
        phone: z.string().trim().min(7, "Phone number is required").max(50),
        city: z.string().trim().min(1, "City is required").max(255),
        state: z.string().trim().min(1, "State is required").max(100),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const fullName = `${input.firstName} ${input.lastName}`.trim();

      const existingCredentials = await getCredentialsByEmail(email);
      if (existingCredentials) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Please sign in instead.",
        });
      }

      const existingUser = await getUserByEmail(email);
      if (existingUser && existingUser.role !== "promoter") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already linked to another account.",
        });
      }

      if (!existingUser) {
        await createPromoter({ name: fullName, email });
      } else {
        await updatePromoter(existingUser.id, { name: fullName, email });
      }

      const promoter = existingUser ?? (await getUserByEmail(email));
      if (!promoter) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create your account. Please try again.",
        });
      }

      await upsertPromoterProfile(promoter.id, {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        city: input.city,
        state: input.state,
      });

      const { sent } = await issuePromoterSetupInvite({
        userId: promoter.id,
        promoterName: fullName,
        email,
        ctx,
        origin: input.origin,
        variant: "signup",
      });
      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We couldn't send your setup email right now. Please try again shortly.",
        });
      }

      return { success: true, email };
    }),

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
        referralFeeOverride: z.string().nullable().optional(),
        promoterCommission: z.string().nullable().optional(),
        adminCommission: z.string().nullable().optional(),
        currency: z.string().default("USD"),
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
        referralFeeOverride: z.string().nullable().optional(),
        promoterCommission: z.string().nullable().optional(),
        adminCommission: z.string().nullable().optional(),
        currency: z.string().optional(),
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
  // Promoter sends a product promotion to one or more products × one or more parents
  send: promoterProcedure
    .input(
      z.object({
        parentIds: z.array(z.number()).min(1, "Select at least one parent"),
        productIds: z.array(z.number()).min(1, "Select at least one product"),
        message: z.string().optional(),
        origin: z.string().url().optional().default("https://app.example.com"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const promoterId = ctx.user.id;
      const { nanoid } = await import("nanoid");
      const promoterName = ctx.user.name ?? "Your referrer";

      const results: { productId: number; parentId: number; success: boolean; error?: string }[] = [];

      for (const productId of input.productIds) {
        // Verify product exists and is active
        const product = await getProductById(productId);
        if (!product || !product.active) {
          for (const parentId of input.parentIds) {
            results.push({ productId, parentId, success: false, error: "Product not found or inactive" });
          }
          continue;
        }

        const priceDisplay = product.price ? `$${parseFloat(product.price).toFixed(2)}` : "Contact us for pricing";

        // Fetch template once per product for all parents
        const productWithTemplate = await getProductWithTemplate(productId);
        const template = productWithTemplate?.template;

        for (const parentId of input.parentIds) {
        try {
          // Verify this parent belongs to the promoter (or admin)
          const parent = await getParentById(parentId);
          if (!parent) { results.push({ productId, parentId, success: false, error: "Parent not found" }); continue; }
          if (ctx.user.role !== "admin" && parent.promoterId !== promoterId) {
            results.push({ productId, parentId, success: false, error: "Parent does not belong to you" }); continue;
          }

          // Generate a unique enrollment token per parent
          const enrollmentToken = nanoid(32);
          await sendProductPromotion({ promoterId, parentId, productId, message: input.message, enrollmentToken });

          const registrationLink = `${input.origin}/enroll/${enrollmentToken}`;

          // Email the parent
          if (parent.email) {
            let emailSubject: string;
            let emailHtml: string;
            let emailText: string | undefined;

            if (template) {
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

            try {
              await sendEmail({ to: parent.email, subject: emailSubject, html: emailHtml, text: emailText });
            } catch (emailErr) {
              console.error(`[Email] Failed to send to parent ${parentId}:`, emailErr);
            }
          }

          results.push({ productId, parentId, success: true });
        } catch (err) {
          console.error(`[Promotion] Failed for parent ${parentId}:`, err);
          results.push({ productId, parentId, success: false, error: err instanceof Error ? err.message : "Unknown error" });
        }
        } // end parentIds loop
      } // end productIds loop

      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      return { success: true, sent, failed, results };
    }),

  // Promoter views their own sent promotions
  myList: promoterProcedure.query(async ({ ctx }) => {
    const promotions = await getProductPromotionsByPromoter(ctx.user.id);
    // Enrich with product and parent info
    const enriched = await Promise.all(
      promotions.map(async (promo) => {
        const [product, parent, enrollment, students, existingPromo] = await Promise.all([
          getProductById(promo.productId),
          getParentById(promo.parentId),
          getProductEnrollmentByPromotionId(promo.id),
          getStudentsByParent(promo.parentId),
          getPromoCodeByPromotion(promo.id),
        ]);
        const promoSent = !!existingPromo;
        const promoCode = existingPromo?.code ?? null;
        return { ...promo, product, parent, enrollment, students, promoSent, promoCode };
      })
    );
    return enriched;
  }),

  // Admin views all sent promotions
  listAll: adminProcedure.query(async () => {
    const promotions = await getAllProductPromotions();
    const enriched = await Promise.all(
      promotions.map(async (promo) => {
        const [product, parent, promoter, enrollment, students] = await Promise.all([
          getProductById(promo.productId),
          getParentById(promo.parentId),
          getUserById(promo.promoterId),
          getProductEnrollmentByPromotionId(promo.id),
          getStudentsByParent(promo.parentId),
        ]);
        return { ...promo, product, parent, promoter, enrollment, students };
      })
    );
    return enriched;
  }),

  // Admin confirms a parent enrolled in a promoted product → dynamic credit
  confirmEnrollment: adminProcedure
    .input(z.object({ promotionId: z.number() }))
    .mutation(async ({ input }) => {
      const promotion = await getProductPromotionById(input.promotionId);
      if (!promotion) throw new TRPCError({ code: "NOT_FOUND", message: "Promotion not found" });
      // Check not already enrolled
      const existing = await getProductEnrollmentByPromotionId(input.promotionId);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already enrolled for this promotion" });
      // Resolve fee: use product-level override if set, else fall back to global setting
      const product = await getProductById(promotion.productId);
      const globalProductFee = await getSetting(SETTING_KEYS.productReferralFee);
      const productFee = product?.referralFeeOverride != null
        ? parseFloat(product.referralFeeOverride)
        : globalProductFee;
      // Create the credit record
      await confirmProductEnrollment({
        promotionId: promotion.id,
        promoterId: promotion.promoterId,
        parentId: promotion.parentId,
        productId: promotion.productId,
        creditAmount: productFee.toFixed(2),
      });
      // Notify the promoter via email
      const [promoter, enrolledParent] = await Promise.all([
        getUserById(promotion.promoterId),
        getParentById(promotion.parentId),
      ]);
      if (promoter?.email && product && enrolledParent) {
        await sendEmail({
          to: promoter.email,
          subject: `🎉 Product Enrollment Confirmed — $${productFee.toFixed(2)} Credit Earned!`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#2563eb;">Great news, ${promoter.name || "Promoter"}!</h2>
              <p>Your referred parent <strong>${enrolledParent.name}</strong> has enrolled in <strong>${product.name}</strong>.</p>
              <p>A <strong>$${productFee.toFixed(2)} referral credit</strong> has been added to your account.</p>
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
      studentFirstName: z.string().min(1, "Student first name is required"),
      studentLastName: z.string().min(1, "Student last name is required"),
      gradeLevel: z.string().min(1, "Grade level is required"),
      educationGoals: z.string().min(10, "Please describe the education goals (at least 10 characters)"),
    }))
    .mutation(async ({ input }) => {
      const promotion = await getPromotionByEnrollmentToken(input.token);
      if (!promotion) throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment link not found or expired" });

      // Check not already enrolled
      const existing = await getProductEnrollmentByPromotionId(promotion.id);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "You have already enrolled in this program" });

      // Update parent info
      await updateParent(promotion.parentId, { name: input.parentName, email: input.parentEmail });
      // Create student record linked to the parent
      await createStudent({
        parentId: promotion.parentId,
        name: input.studentFirstName,
        lastName: input.studentLastName,
        gradeLevel: input.gradeLevel,
        educationGoals: input.educationGoals,
      });
      // Resolve fee: use product-level override if set, else fall back to global setting
      const enrollProduct = await getProductById(promotion.productId);
      const globalFee = await getSetting(SETTING_KEYS.productReferralFee);
      const productFee = enrollProduct?.referralFeeOverride != null
        ? parseFloat(enrollProduct.referralFeeOverride)
        : globalFee;
      // Create the enrollment record (dynamic credit for promoter)
      await confirmProductEnrollment({
        promotionId: promotion.id,
        promoterId: promotion.promoterId,
        parentId: promotion.parentId,
        productId: promotion.productId,
        creditAmount: productFee.toFixed(2),
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
                <p>A <strong>$${productFee.toFixed(2)} referral credit</strong> has been added to your account.</p>
                <p style="color:#6b7280;font-size:0.875rem;">Log in to your dashboard to view your earnings and payout status.</p>
              </div>
            `,
            text: `Great news! ${input.parentName} has enrolled in ${product.name} using your referral link. A $${productFee.toFixed(2)} referral credit has been added to your account.`,
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


// ─── Promo Codes Router ───────────────────────────────────────────────────────

const promoCodesRouter = router({
  generate: promoterProcedure
    .input(z.object({
      promoId: z.number(),
      parentId: z.number(),
      studentId: z.number(),
      promoterId: z.number(),
      productName: z.string(),
      parentEmail: z.string(),
      parentName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const code = await createPromoCode({
        parentId: input.parentId,
        studentId: input.studentId,
        promoterId: ctx.user.id,
        promotionId: input.promoId,
      });
      await sendEmail({
        to: input.parentEmail,
        subject: `Your Exclusive Promo Code for ${input.productName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: #4f46e5; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">Your Promo Code</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px;">Hi <strong>${input.parentName}</strong>,</p>
              <p style="font-size: 16px;">You have received an exclusive promo code for <strong>${input.productName}</strong>.</p>
              <div style="background: #ede9fe; border: 1px solid #a5b4fc; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #4f46e5;">Your Promo Code</p>
                <p style="margin: 8px 0 0; font-size: 36px; font-weight: bold; color: #4f46e5; letter-spacing: 4px;">${code}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #6366f1;">Use this code to get 10% discount when enrolling</p>
              </div>
              <div style="text-align: center; margin-top: 20px;"><a href="https://edkonnect-academy.com/" style="background: #4f46e5; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Login to Edkonnect</a></div>
            </div>
          </div>
        `,
      });
      return { success: true, code };
    }),

  listByParent: adminProcedure
    .input(z.object({ parentId: z.number() }))
    .query(async ({ input }) => {
      return getPromoCodesByParent(input.parentId);
    }),

  myList: promoterProcedure.query(async ({ ctx }) => {
    return getPromoCodesByPromoter(ctx.user.id);
  }),
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
  promoCodes: promoCodesRouter,
});

export type AppRouter = typeof appRouter;

