import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationList, ProgressHistory } from "@/features/learner-utilities/components";
import { getLearnerUtilitiesCopy } from "@/features/learner-utilities/copy";

const copy = getLearnerUtilitiesCopy("en");

describe("learner utilities presentation", () => {
  it("renders factual progress, preserved history, local dates, and attempt links", () => {
    render(<ProgressHistory copy={copy} locale="en" progress={{
      courses: [{ generationId: "generation-1", generationNumber: 1, isActive: false, courseId: "course-1", revisionId: "revision-1", language: "EN", title: "Earlier English course", percentage: 100, startedAt: new Date("2026-10-01T09:00:00Z"), completedAt: new Date("2026-10-02T09:00:00Z"), closedAt: new Date("2026-10-03T09:00:00Z") }],
      events: [{ id: "event-1", generationId: "generation-1", action: "course_completed", courseTitle: "Earlier English course", lessonTitle: null, itemTitle: null, occurredAt: new Date("2026-10-02T09:00:00Z") }],
      quizAttempts: [{ id: "attempt-1", courseId: "course-1", lessonId: "lesson-1", itemId: "item-1", courseTitle: "Earlier English course", itemTitle: "Closing quiz", cycleNumber: 2, attemptNumber: 1, scorePercentage: 80, passed: true, startedAt: new Date("2026-10-02T08:00:00Z"), submittedAt: new Date("2026-10-02T08:10:00Z") }],
    }} />);
    expect(screen.getByText("Preserved history")).toBeInTheDocument();
    expect(screen.getByText("Course completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View result" })).toHaveAttribute("href", "/en/courses/course-1/lessons/lesson-1/items/item-1/result/attempt-1");
    expect(screen.getAllByRole("time")[0]).toHaveAttribute("datetime", "2026-10-01T09:00:00.000Z");
  });

  it("renders chronological notifications without unread controls and supports an empty state", () => {
    const { rerender } = render(<NotificationList copy={copy} locale="en" notifications={[
      { id: "newer", eventType: "progress_reset", language: "EN", courseId: "course-1", revisionId: "revision-1", resetRecordId: "reset-1", detail: { scope: "quiz" }, createdAt: new Date("2026-10-05T10:00:00Z") },
      { id: "older", eventType: "course_published", language: "EN", courseId: "course-1", revisionId: "revision-1", resetRecordId: null, detail: { title: "English course" }, createdAt: new Date("2026-10-04T10:00:00Z") },
    ]} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByRole("heading", { name: "Progress reset" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /read/i })).not.toBeInTheDocument();
    rerender(<NotificationList copy={copy} locale="en" notifications={[]} />);
    expect(screen.getByRole("heading", { name: "No notifications" })).toBeInTheDocument();
  });
});