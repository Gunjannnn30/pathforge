import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only.")
  .transform((v) => v.toLowerCase());

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(60),
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(240).optional().nullable(),
    avatarUrl: z.string().trim().max(500).optional().nullable(),
    timezone: z.string().min(1).max(64).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

export const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().min(2).max(10).optional(),
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  streakNotifications: z.boolean().optional(),
  hideStreakDisplay: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  aiCompanionEnabled: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

// ---------- Game actions ----------

export const completeLessonSchema = z.object({
  lessonId: z.string().min(1),
  // idempotency key: client-generated, ensures exactly-once awarding
  idempotencyKey: z.string().min(8).max(128),
});

export const submitAssessmentSchema = z.object({
  assessmentId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().min(8).max(128),
});

export const submitChallengeSchema = z.object({
  challengeId: z.string().min(1),
  submittedWorkReference: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().min(8).max(128),
});

export const completeMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  evidenceUrl: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().min(8).max(128),
});

export const dismissQuestSchema = z.object({
  questId: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompleteLessonInput = z.infer<typeof completeLessonSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
export type SubmitChallengeInput = z.infer<typeof submitChallengeSchema>;
export type CompleteMilestoneInput = z.infer<typeof completeMilestoneSchema>;
