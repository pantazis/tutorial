import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const hierarchyPath = path.resolve(process.cwd(), ".ai-guide/COMPONENT-HIERARCHY.mmd");

const pageIds = [
  "PG-PUBLIC-CONTINUE",
  "PG-AUTH",
  "PG-ROLE-LANDING",
  "PG-MY-COURSE",
  "PG-PROFILE",
  "PG-MY-PROGRESS",
  "PG-NOTIFICATIONS",
  "PG-HELP",
  "PG-COURSE",
  "PG-LESSON",
  "PG-TUTORIAL",
  "PG-MEDITATION",
  "PG-QUIZ",
  "PG-QUIZ-RESULT",
  "PG-QUIZ-HISTORY",
  "PG-ADMIN-HOME",
  "PG-ADMIN-COURSES",
  "PG-ADMIN-COURSE",
  "PG-ADMIN-LESSON",
  "PG-ADMIN-GOVERNANCE",
  "PG-ADMIN-PREVIEW",
  "PG-ADMIN-LEARNERS",
  "PG-ADMIN-LEARNER",
  "PG-RESET",
  "PG-REPORTS",
  "PG-ADMIN-MGMT",
  "ST-DENIED",
  "ST-UNAVAILABLE",
] as const;

describe("component hierarchy", () => {
  it("maps Application to every shell and every page/state to shared components", async () => {
    const source = await readFile(hierarchyPath, "utf8");

    for (const shell of ["PublicShell", "AuthShell", "LearnerShell", "CourseShell", "AdminShell", "PreviewShell"]) {
      expect(source).toMatch(new RegExp(`APP --> [A-Z]+\\[${shell}\\]`));
    }

    for (const pageId of pageIds) {
      const declaration = source.match(new RegExp(`([A-Z]+)\\[${pageId}\\]`));
      expect(declaration, `${pageId} must be declared`).not.toBeNull();
      expect(source, `${pageId} must map to a shared component`).toMatch(
        new RegExp(`^\\s*${declaration?.[1]} --> (PH|RN|SB|FE|CV|LI|QV|AV|GV)$`, "m"),
      );
    }
  });

  it("contains no prototype fixture or scenario controls", async () => {
    const source = await readFile(hierarchyPath, "utf8");
    expect(source).not.toMatch(/prototype|fixture|scenario control|role chooser/i);
  });
});