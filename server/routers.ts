import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createParent,
  createReferral,
  createStudent,
  deleteParent,
  deleteStudent,
  enrollStudent,
  getAllParents,
  getAllPromoters,
  getAllReferrals,
  getAllStudents,
  getParentById,
  getParentsByPromoter,
  getPromoterEarningsSummary,
  getReferralByStudentId,
  getReferralsByPromoter,
  getStudentById,
  getStudentsByParent,
  getStudentsByPromoter,
  getUserById,
  markReferralPaid,
  updateParent,
  updateStudent,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sendEmail } from "./_core/email";

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
});

export type AppRouter = typeof appRouter;
