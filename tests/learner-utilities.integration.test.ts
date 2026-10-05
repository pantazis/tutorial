import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { IdentityService } from "@/server/auth/service";
import { LearnerUtilitiesService } from "@/server/learner-utilities/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const identity = new IdentityService(pool);
const utilities = new LearnerUtilitiesService(pool);
const password = "A-strong-test-password-123";

async function account(email: string, language: "EL" | "EN" = "EN") {
  const registration = await identity.register({ email, password, preferredLanguage: language });
  if (!registration.ok) throw new Error(registration.message);
  const verification = await identity.verifyAccount(await identity.issueVerificationToken(registration.value.accountId));
  if (!verification.ok) throw new Error(verification.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: registration.value.accountId, sessionToken: login.value.sessionToken };
}

async function progressFixture(accountId: string) {
  const courseId = randomUUID();
  const revisionId = randomUUID();
  const generationId = randomUUID();
  await pool.query("INSERT INTO courses (id, language, admin_order, lifecycle_status, created_by) VALUES ($1, 'EN', 0, 'draft', $2)", [courseId, accountId]);
  await pool.query(
    `INSERT INTO course_revisions
       (id, course_id, revision_number, state, title, summary, cover_kind, cover_alt, source_title, source_attribution, created_by)
     VALUES ($1, $2, 1, 'draft', 'Preserved English course', 'Factual history fixture', 'fallback', 'Fallback', 'Fixture', 'Fixture attribution', $3)`,
    [revisionId, courseId, accountId],
  );
  await pool.query("INSERT INTO learner_course_generations (id, account_id, course_id, revision_id, generation_number) VALUES ($1, $2, $3, $4, 1)", [generationId, accountId, courseId, revisionId]);
  await pool.query("INSERT INTO learner_course_progress (generation_id, started_at, percentage) VALUES ($1, statement_timestamp(), 25)", [generationId]);
  await pool.query(
    `INSERT INTO learner_progress_history (id, generation_id, account_id, course_id, revision_id, action)
     VALUES ($1, $2, $3, $4, $5, 'course_started')`,
    [randomUUID(), generationId, accountId, courseId, revisionId],
  );
  return { courseId, generationId };
}

beforeEach(async () => {
  await pool.query(`TRUNCATE administrator_access_audit, notifications, reset_records, reset_previews,
    quiz_submitted_answers, quiz_attempt_options, quiz_attempt_questions, quiz_attempts, quiz_cycles,
    learner_progress_history, learner_item_progress, learner_lesson_progress, learner_course_progress,
    learner_course_generations, course_audit, course_activity_history, course_publication_history,
    governance_reviews, lesson_prerequisites, quiz_options, quiz_questions, quiz_definitions,
    meditation_contents, topic_contents, lesson_items, course_lessons, course_groups, course_revisions,
    courses, security_audit, admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`);
});

afterAll(async () => pool.end());

describe("learner utilities service", () => {
  it("returns only the authenticated learner profile and factual history", async () => {
    const first = await account("first-utilities@example.test");
    const other = await account("other-utilities@example.test");
    const firstFixture = await progressFixture(first.accountId);
    await progressFixture(other.accountId);

    await expect(utilities.profile(first.sessionToken)).resolves.toMatchObject({ ok: true, value: { accountId: first.accountId, email: "first-utilities@example.test" } });
    const progress = await utilities.progress(first.sessionToken);
    expect(progress).toMatchObject({ ok: true, value: { courses: [{ courseId: firstFixture.courseId }], events: [{ generationId: firstFixture.generationId }] } });
    expect(JSON.stringify(progress)).not.toContain(other.accountId);
    await expect(utilities.progress("")).resolves.toMatchObject({ ok: false, code: "unauthenticated" });
  });

  it("changes preference from the session identity without rewriting prior progress or history", async () => {
    const learner = await account("language-utilities@example.test", "EN");
    const fixture = await progressFixture(learner.accountId);
    const before = await utilities.progress(learner.sessionToken);
    await expect(identity.updatePreferredLanguage(learner.sessionToken, "EL")).resolves.toEqual({ ok: true, value: { language: "EL" } });
    await expect(identity.updatePreferredLanguage(learner.sessionToken, "FR")).resolves.toMatchObject({ ok: false, code: "validation" });
    const context = await identity.loadProtectedContext(learner.sessionToken);
    const after = await utilities.progress(learner.sessionToken);
    expect(context).toMatchObject({ ok: true, value: { language: "EL" } });
    expect(after).toEqual(before);
    expect(after.ok && after.value.courses[0]).toMatchObject({ courseId: fixture.courseId, language: "EN" });
    const audit = await pool.query("SELECT detail FROM security_audit WHERE event_type = 'preferred_language_changed'");
    expect(audit.rows).toEqual([{ detail: { from: "EN", to: "EL" } }]);
  });
});