import { z } from "zod";

export const quizSubmissionSchema = z
  .array(
    z
      .object({
        questionId: z.string().uuid(),
        optionIds: z.array(z.string().uuid()).min(1),
      })
      .strict(),
  )
  .min(1);

export const resetCycleSchema = z
  .object({
    learnerAccountId: z.string().uuid(),
    courseId: z.string().uuid(),
    quizItemId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000),
    waitSeconds: z.number().int().min(0).max(2_592_000).default(0),
  })
  .strict();