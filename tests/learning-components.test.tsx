import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CourseCard, CourseOutline, LessonItemList } from "@/features/learning/components";
import type { LearnerCatalogEntry, LearnerCourse } from "@/server/learning/types";

const cover = { kind: "fallback" as const, uri: null, alt: "Fallback course cover", focalX: 50, focalY: 50 };

const catalogCourse: LearnerCatalogEntry = {
  courseId: "11111111-1111-4111-8111-111111111111",
  revisionId: "22222222-2222-4222-8222-222222222222",
  language: "EN",
  title: "Available course",
  summary: "Course summary",
  cover,
  adminOrder: 1,
  status: "available",
  percentage: 0,
  startedAt: null,
  completedAt: null,
};

const course: LearnerCourse = {
  ...catalogCourse,
  lessons: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Opening lesson",
      summary: "Ungrouped opening lesson",
      position: 0,
      group: null,
      prerequisiteLessonIds: [],
      status: "completed",
      lockReason: null,
      percentage: 100,
      startedAt: new Date("2026-09-29T08:00:00Z"),
      completedAt: new Date("2026-09-29T08:30:00Z"),
      items: [{ id: "44444444-4444-4444-8444-444444444444", type: "tutorial", title: "Required tutorial", summary: "Required summary", required: true, position: 0, meditationFormat: null, completedAt: new Date("2026-09-29T08:30:00Z") }],
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      title: "Grouped lesson",
      summary: "Grouped available lesson",
      position: 1,
      group: { id: "66666666-6666-4666-8666-666666666666", title: "Practice group", summary: "Grouped lessons", position: 1 },
      prerequisiteLessonIds: [],
      status: "available",
      lockReason: null,
      percentage: 0,
      startedAt: null,
      completedAt: null,
      items: [
        { id: "77777777-7777-4777-8777-777777777777", type: "guided_meditation", title: "Required meditation", summary: "Required meditation summary", required: true, position: 0, meditationFormat: "text", completedAt: null },
        { id: "88888888-8888-4888-8888-888888888888", type: "topic", title: "Optional reading", summary: "Optional summary", required: false, position: 1, meditationFormat: null, completedAt: null },
      ],
    },
    {
      id: "99999999-9999-4999-8999-999999999999",
      title: "Locked lesson",
      summary: "Visible but unavailable lesson",
      position: 2,
      group: { id: "66666666-6666-4666-8666-666666666666", title: "Practice group", summary: "Grouped lessons", position: 1 },
      prerequisiteLessonIds: ["55555555-5555-4555-8555-555555555555"],
      status: "locked",
      lockReason: "Complete prerequisite lessons first.",
      percentage: 0,
      startedAt: null,
      completedAt: null,
      items: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "quiz", title: "Required quiz", summary: "Quiz summary", required: true, position: 0, meditationFormat: null, completedAt: null }],
    },
  ],
};

describe("learning presentation", () => {
  it("keeps opening separate from explicit course start and renders the branded fallback cover", () => {
    render(<CourseCard course={catalogCourse} locale="en" />);
    expect(screen.getByRole("img", { name: "Fallback course cover" })).toHaveTextContent("FreeMeditation.gr course cover");
    expect(screen.getByRole("button", { name: "Start Course" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/en/courses/11111111-1111-4111-8111-111111111111");
  });

  it("renders mixed grouped and ungrouped lessons while locked lessons remain non-actionable with a reason", () => {
    render(<CourseOutline course={{ ...course, status: "in_progress", startedAt: new Date("2026-09-29T08:00:00Z") }} locale="en" />);
    expect(screen.getByRole("heading", { name: "Opening lesson" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Practice group" })).toBeInTheDocument();
    const locked = screen.getByRole("heading", { name: "Locked lesson" }).closest("article");
    expect(locked).not.toBeNull();
    expect(within(locked!).getByText("Complete prerequisite lessons first.")).toBeInTheDocument();
    expect(within(locked!).queryByRole("link")).not.toBeInTheDocument();
    expect(within(locked!).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows localized Required and Optional facts supplied by the server read model", () => {
    const startedCourse = { ...course, status: "in_progress" as const, startedAt: new Date("2026-09-29T08:00:00Z") };
    const lesson = { ...startedCourse.lessons[1], status: "in_progress" as const, startedAt: new Date("2026-09-29T09:00:00Z") };
    render(<LessonItemList course={startedCourse} lesson={lesson} locale="en" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Required meditation/ })).toBeInTheDocument();
  });
});