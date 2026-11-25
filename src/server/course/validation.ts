import { z } from "zod";

import type { CourseRevisionInput, FieldIssue, PublicationBlocker } from "./types";

const draftText = (maximum: number) => z.string().trim().max(maximum);
const draftUrl = (maximum: number) => z.union([z.literal(""), z.string().trim().url().max(maximum)]);
const optionalUuid = z.string().uuid().optional();

const itemBase = { id: optionalUuid, title: draftText(200), summary: draftText(1000), required: z.boolean().optional(), hidden: z.boolean().optional() };
const optionSchema = z.object({ id: optionalUuid, label: draftText(500), correct: z.boolean() }).strict();
const questionSchema = z
  .object({
    type: z.enum(["single_choice", "multiple_choice", "true_false"]),
    id: optionalUuid,
    prompt: draftText(2000),
    options: z.array(optionSchema).max(100),
  })
  .strict();

const itemSchema = z.discriminatedUnion("type", [
  z.object({ ...itemBase, type: z.enum(["tutorial", "topic"]), body: draftText(50000) }).strict(),
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
      attribution: draftText(1000),
    })
    .strict(),
  z
    .object({
      ...itemBase,
      type: z.literal("quiz"),
      passPercentage: z.number().int().min(1).max(100),
      attemptLimit: z.number().int().positive().nullable(),
      revealPolicy: z.enum(["never", "after_submission", "after_exhaustion"]),
      questions: z.array(questionSchema).max(200),
    })
    .strict(),
  ...(["youtube", "document", "download", "external_resource", "assignment"] as const).map((type) =>
    z.object({ ...itemBase, type: z.literal(type) }).strict(),
  ),
]);

const lessonSchema = z
  .object({
    id: optionalUuid,
    key: z.string().trim().min(1).max(100),
    title: draftText(200),
    summary: draftText(1000),
    hidden: z.boolean().optional(),
    prerequisiteKeys: z.array(z.string().trim().min(1).max(100)).optional(),
    items: z.array(itemSchema).max(500),
  })
  .strict();

export const courseRevisionSchema = z
  .object({
    language: z.enum(["EL", "EN"]),
    adminOrder: z.number().int().min(0),
    title: draftText(200),
    summary: draftText(1000),
    cover: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("fallback"),
          alt: draftText(500),
          focalX: z.number().min(0).max(100).optional(),
          focalY: z.number().min(0).max(100).optional(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("uploaded"),
          uri: draftUrl(2000),
          alt: draftText(500),
          provenance: draftText(1000),
          focalX: z.number().min(0).max(100).optional(),
          focalY: z.number().min(0).max(100).optional(),
        })
        .strict(),
    ]),
    source: z
      .object({
        title: draftText(300),
        attribution: draftText(1000),
        uri: z.string().trim().url().max(2000).optional(),
      })
      .strict(),
    outline: z.array(
      z.discriminatedUnion("type", [
        lessonSchema.extend({ type: z.literal("lesson") }).strict(),
        z
          .object({
            type: z.literal("group"),
            id: optionalUuid,
            title: draftText(200),
            summary: draftText(1000),
            hidden: z.boolean().optional(),
            lessons: z.array(lessonSchema).max(500),
          })
          .strict(),
      ]),
    ).max(500),
  })
  .strict();

export function revisionFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

export function validateDraftSemantics(input: CourseRevisionInput): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const seen = new Set<string>();
  const lessonKeys = new Set<string>();
  const lessonReferences: Array<{ key: string; prerequisiteKeys?: string[]; path: string }> = [];
  const acceptId = (id: string | undefined, path: string) => {
    if (!id) return;
    if (seen.has(id)) issues.push({ path, message: "Persisted identities must be unique within the command." });
    seen.add(id);
  };
  for (const [nodeIndex, node] of input.outline.entries()) {
    if (node.type === "group") acceptId(node.id, `outline.${nodeIndex}.id`);
    const nodeLessons = node.type === "lesson" ? [node] : node.lessons;
    for (const [lessonIndex, lesson] of nodeLessons.entries()) {
      const lessonPath = node.type === "lesson" ? `outline.${nodeIndex}` : `outline.${nodeIndex}.lessons.${lessonIndex}`;
      if (lessonKeys.has(lesson.key)) issues.push({ path: `${lessonPath}.key`, message: "Lesson keys must be unique within the command." });
      lessonKeys.add(lesson.key);
      lessonReferences.push({ key: lesson.key, prerequisiteKeys: lesson.prerequisiteKeys, path: lessonPath });
      acceptId(lesson.id, `${lessonPath}.id`);
      for (const [itemIndex, item] of lesson.items.entries()) {
        const itemPath = `${lessonPath}.items.${itemIndex}`;
        acceptId(item.id, `${itemPath}.id`);
        if (item.type === "quiz") for (const [questionIndex, question] of item.questions.entries()) {
          acceptId(question.id, `${itemPath}.questions.${questionIndex}.id`);
          for (const [optionIndex, option] of question.options.entries()) acceptId(option.id, `${itemPath}.questions.${questionIndex}.options.${optionIndex}.id`);
        }
      }
    }
  }
  for (const lesson of lessonReferences) {
    for (const [index, prerequisiteKey] of (lesson.prerequisiteKeys ?? []).entries()) {
      if (prerequisiteKey === lesson.key || !lessonKeys.has(prerequisiteKey)) {
        issues.push({ path: `${lesson.path}.prerequisiteKeys.${index}`, message: "Prerequisites must reference another lesson in this command." });
      }
    }
  }
  return issues;
}

export function validatePublication(input: CourseRevisionInput): PublicationBlocker[] {
  const blockers: PublicationBlocker[] = [];
  const requireText = (value: string | undefined, path: string, label: string) => {
    if (!value?.trim()) blockers.push({ path, message: `${label} is required for publication.` });
  };
  requireText(input.title, "title", "Course title");
  requireText(input.summary, "summary", "Course summary");
  requireText(input.cover.alt, "cover.alt", "Cover alternative text");
  if (input.cover.kind === "uploaded") {
    requireText(input.cover.uri, "cover.uri", "Cover URI");
    requireText(input.cover.provenance, "cover.provenance", "Cover provenance");
  }
  requireText(input.source.title, "source.title", "Source title");
  requireText(input.source.attribution, "source.attribution", "Source attribution");

  for (const [index, node] of input.outline.entries()) {
    if (node.type === "group" && !node.hidden) {
      requireText(node.title, `outline.${index}.title`, "Visible group title");
      requireText(node.summary, `outline.${index}.summary`, "Visible group summary");
    }
  }
  const lessons = input.outline.flatMap((node) => (node.type === "lesson" ? [node] : node.lessons));
  const groupHiddenByLesson = new Map(lessons.flatMap((lesson) => {
    const parent = input.outline.find((node) => node.type === "group" && node.lessons.includes(lesson));
    return [[lesson, parent?.hidden === true]] as const;
  }));
  const visibleLessons = lessons.filter((lesson) => !lesson.hidden && !groupHiddenByLesson.get(lesson));
  if (visibleLessons.length === 0) blockers.push({ path: "outline", message: "A publishable course requires at least one visible lesson." });

  const keys = new Set<string>();
  for (const lesson of visibleLessons) {
    if (keys.has(lesson.key)) blockers.push({ path: "outline", message: "Lesson keys must be unique within a revision." });
    keys.add(lesson.key);
    requireText(lesson.title, "outline", "Visible lesson title");
    requireText(lesson.summary, "outline", "Visible lesson summary");
    const items = lesson.items.filter((item) => !item.hidden);
    if (items.length === 0) blockers.push({ path: "outline", message: "Every visible lesson requires at least one visible item." });
    if (!items.some((item) => item.required !== false)) blockers.push({ path: "outline", message: "Every visible lesson requires at least one visible Required item." });

    for (const item of items) {
      requireText(item.title, "outline", "Visible item title");
      requireText(item.summary, "outline", "Visible item summary");
      if (item.type === "tutorial" || item.type === "topic") requireText(item.body, "outline", "Article body");
      if (item.type === "guided_meditation") {
        requireText(item.attribution, "outline", "Meditation attribution");
        if (item.format === "text" && (!item.body || item.mediaUri)) blockers.push({ path: "outline", message: "Text meditation content is invalid." });
        if (item.format !== "text" && (!item.mediaUri || !item.transcript || !item.directFallbackUri)) {
          blockers.push({ path: "outline", message: "Media meditation requires media, transcript, and direct fallback." });
        }
        if (item.format === "video" && !item.captionsUri) blockers.push({ path: "outline", message: "Video meditation requires captions metadata." });
      }
      if (item.type === "quiz") {
        if (item.questions.length === 0) blockers.push({ path: "outline", message: "A quiz requires at least one question." });
        for (const question of item.questions) {
          requireText(question.prompt, "outline", "Quiz question prompt");
          const correct = question.options.filter((option) => option.correct).length;
          if (question.options.length < 2) blockers.push({ path: "outline", message: "Quiz questions require at least two options." });
          if (question.options.some((option) => !option.label.trim())) blockers.push({ path: "outline", message: "Quiz option labels are required." });
          if (question.type === "multiple_choice" ? correct < 1 : correct !== 1) blockers.push({ path: "outline", message: "Quiz correct-option rules are invalid." });
          if (question.type === "true_false" && question.options.length !== 2) blockers.push({ path: "outline", message: "True/false questions require exactly two options." });
        }
      }
      if (["youtube", "document", "download", "external_resource", "assignment"].includes(item.type)) blockers.push({ path: "outline", message: `${item.type} content is not complete until its typed authoring support is available.` });
    }
  }

  const edges = new Map<string, string[]>();
  for (const [index, lesson] of visibleLessons.entries()) {
    const prerequisites = lesson.prerequisiteKeys ?? (index === 0 ? [] : [visibleLessons[index - 1].key]);
    if (prerequisites.some((key) => !keys.has(key) || key === lesson.key)) {
      blockers.push({ path: "outline", message: "Visible lesson prerequisites must reference another visible lesson in the same revision." });
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
  if (visibleLessons.some((lesson) => !visit(lesson.key))) blockers.push({ path: "outline", message: "Lesson prerequisites must be acyclic." });
  return blockers;
}