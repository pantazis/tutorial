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
