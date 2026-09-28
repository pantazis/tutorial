import { z } from "zod";

const text = (maximum: number) => z.string().trim().min(1).max(maximum);

const itemBase = { title: text(200), summary: text(1000), required: z.boolean().optional() };
const optionSchema = z.object({ label: text(500), correct: z.boolean() }).strict();
const questionSchema = z
  .object({
    type: z.enum(["single_choice", "multiple_choice", "true_false"]),
    prompt: text(2000),
    options: z.array(optionSchema).min(2),
  })
  .strict();

const itemSchema = z.discriminatedUnion("type", [
  z.object({ ...itemBase, type: z.enum(["tutorial", "topic"]), body: text(50000) }).strict(),
  z
    .object({
      ...itemBase,
      type: z.literal("guided_meditation"),
      format: z.enum(["text", "audio", "video"]),
      body: z.string().trim().min(1).max(50000).optional(),
      mediaUri: z.string().trim().url().max(2000).optional(),
      transcript: z.string().trim().min(1).max(50000).optional(),
      captionsUri: z.string().trim().url().max(2000).optional(),
      directFallbackUri: z.string().trim().url().max(2000).optional(),
      attribution: text(1000),
    })
    .strict(),
  z
    .object({
      ...itemBase,
      type: z.literal("quiz"),
      passPercentage: z.number().int().min(1).max(100),
      attemptLimit: z.number().int().positive().nullable(),
      revealPolicy: z.enum(["never", "after_submission", "after_exhaustion"]),
      questions: z.array(questionSchema).min(1),
    })
    .strict(),
]);

const lessonSchema = z
  .object({
    key: z.string().trim().min(1).max(100),
    title: text(200),
    summary: text(1000),
    prerequisiteKeys: z.array(z.string().trim().min(1).max(100)).optional(),
    items: z.array(itemSchema).min(1),
  })
  .strict();

export const courseRevisionSchema = z
  .object({
    language: z.enum(["EL", "EN"]),
    adminOrder: z.number().int().min(0),
    title: text(200),
    summary: text(1000),
    cover: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("fallback"),
          alt: text(500),
          focalX: z.number().min(0).max(100).optional(),
          focalY: z.number().min(0).max(100).optional(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("uploaded"),
          uri: z.string().trim().url().max(2000),
          alt: text(500),
          provenance: text(1000),
          focalX: z.number().min(0).max(100).optional(),
          focalY: z.number().min(0).max(100).optional(),
        })
        .strict(),
    ]),
    source: z
      .object({
        title: text(300),
        attribution: text(1000),
        uri: z.string().trim().url().max(2000).optional(),
      })
      .strict(),
    outline: z.array(
      z.discriminatedUnion("type", [
        lessonSchema.extend({ type: z.literal("lesson") }).strict(),
        z
          .object({
            type: z.literal("group"),
            title: text(200),
            summary: text(1000),
            lessons: z.array(lessonSchema).min(1),
          })
          .strict(),
      ]),
    ),
  })
  .strict();

export function validateRevisionSemantics(input: z.infer<typeof courseRevisionSchema>): string | null {
  const lessons = input.outline.flatMap((node) => (node.type === "lesson" ? [node] : node.lessons));
  if (lessons.length === 0) return "A publishable course requires at least one lesson.";

  const keys = new Set<string>();
  for (const lesson of lessons) {
    if (keys.has(lesson.key)) return "Lesson keys must be unique within a revision.";
    keys.add(lesson.key);
    if (!lesson.items.some((item) => item.required !== false)) {
      return "Every lesson requires at least one Required item.";
    }

    for (const item of lesson.items) {
      if (item.type === "guided_meditation") {
        if (item.format === "text" && (!item.body || item.mediaUri)) return "Text meditation content is invalid.";
        if (item.format !== "text" && (!item.mediaUri || !item.transcript || !item.directFallbackUri)) {
          return "Media meditation requires media, transcript, and direct fallback.";
        }
        if (item.format === "video" && !item.captionsUri) return "Video meditation requires captions metadata.";
      }
      if (item.type === "quiz") {
        for (const question of item.questions) {
          const correct = question.options.filter((option) => option.correct).length;
          if (question.type === "multiple_choice" ? correct < 1 : correct !== 1) {
            return "Quiz correct-option rules are invalid.";
          }
          if (question.type === "true_false" && question.options.length !== 2) {
            return "True/false questions require exactly two options.";
          }
        }
      }
    }
  }

  const edges = new Map<string, string[]>();
  for (const [index, lesson] of lessons.entries()) {
    const prerequisites = lesson.prerequisiteKeys ?? (index === 0 ? [] : [lessons[index - 1].key]);
    if (prerequisites.some((key) => !keys.has(key) || key === lesson.key)) {
      return "Lesson prerequisites must reference another lesson in the same revision.";
    }
    edges.set(lesson.key, prerequisites);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): boolean => {
    if (visiting.has(key)) return false;
    if (visited.has(key)) return true;
    visiting.add(key);
    for (const dependency of edges.get(key) ?? []) if (!visit(dependency)) return false;
    visiting.delete(key);
    visited.add(key);
    return true;
  };
  if (lessons.some((lesson) => !visit(lesson.key))) return "Lesson prerequisites must be acyclic.";
  return null;
}