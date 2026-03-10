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

      // Send invitation email
      try {
        await sendEmail({
          to: input.email,
          subject: `You've been invited to join the Tutoring Referral Program`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">Welcome to the Referral Program!</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 16px;">Hi <strong>${input.name}</strong>,</p>
                <p style="font-size: 16px;">You've been invited as a promoter for our tutoring referral program. Click the button below to set up your account and start earning $50 for every student you refer who enrolls.</p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${setupUrl}" style="background: #1e40af; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">Set Up My Account</a>
                </div>
                <p style="font-size: 13px; color: #6b7280;">Or copy this link into your browser:<br/><a href="${setupUrl}" style="color: #1e40af; word-break: break-all;">${setupUrl}</a></p>
                <p style="font-size: 13px; color: #6b7280;">This invitation link expires in <strong>7 days</strong>.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">Tutoring Referral Manager &mdash; Earn $50 for every student you refer who enrolls!</p>
              </div>
            </div>
          `,
        });
      } catch (err) {
        console.error("[Email] Failed to send invite email:", err);
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
});

export type AppRouter = typeof appRouter;
