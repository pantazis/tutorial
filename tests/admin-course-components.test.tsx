import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminCourseList, AdminPreview, GovernanceView } from "@/features/admin-course/components";
import { ConfirmLifecycle } from "@/features/admin-course/components/ConfirmLifecycle";
import type { AdminCourseDetail, AdminCourseListEntry, CourseReadModel } from "@/server/course/types";

const course: AdminCourseListEntry = {
  courseId: "11111111-1111-4111-8111-111111111111",
  language: "EL",
  adminOrder: 1,
  lifecycleStatus: "draft",
  revisionId: "22222222-2222-4222-8222-222222222222",
  revisionNumber: 1,
  version: 2,
  revisionState: "draft",
  title: "Ελληνικό μάθημα",
  updatedAt: "2026-10-05T10:00:00.000Z",
};

const preview: CourseReadModel = {
  courseId: course.courseId,
  revisionId: course.revisionId,
  language: "EL",
  title: course.title,
  summary: "Ελληνική περίληψη",
  cover: { kind: "fallback", uri: null, alt: "Εναλλακτικό εξώφυλλο", focalX: 50, focalY: 50 },
  source: { title: "Πηγή", attribution: "Απόδοση", uri: null },
  outline: [{ type: "lesson", title: "Μάθημα", summary: "Περίληψη", lessons: [{ id: "33333333-3333-4333-8333-333333333333", title: "Μάθημα", summary: "Περίληψη", prerequisiteLessonIds: [], items: [{ id: "44444444-4444-4444-8444-444444444444", type: "tutorial", title: "Οδηγός", summary: "Περίληψη", required: true }] }] }],
};

const detail: AdminCourseDetail = {
  course,
  input: { language: "EL", adminOrder: 1, title: course.title, summary: preview.summary, cover: { kind: "fallback", alt: preview.cover.alt }, source: { title: preview.source.title, attribution: preview.source.attribution }, outline: [{ type: "lesson", key: "opening", title: "Μάθημα", summary: "Περίληψη", items: [{ type: "tutorial", title: "Οδηγός", summary: "Περίληψη", body: "Κείμενο" }] }] },
  blockers: ["Current Sahaja Review approval is required."],
  reviews: [{ id: "review-1", reviewType: "language", decision: "approved", notes: "Approved Greek language evidence.", reviewerEmail: "admin@example.test", revisionVersion: 2, decidedAt: "2026-10-05T10:00:00.000Z" }],
  publicationHistory: [{ id: "history-1", action: "unpublished", actorEmail: "admin@example.test", occurredAt: "2026-10-05T11:00:00.000Z" }],
};

describe("administration course presentation", () => {
  it("renders Greek course fragments inside administrative lists with lifecycle and revision facts", () => {
    render(<AdminCourseList courses={[course]} />);
    const item = screen.getByRole("listitem");
    expect(item).toHaveAttribute("lang", "el");
    expect(within(item).getByText("Ελληνικό μάθημα")).toBeInTheDocument();
    expect(within(item).getByText("Order 1")).toBeInTheDocument();
    expect(within(item).getByText("Revision 1, version 2")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Preview" })).toHaveAttribute("href", `/admin/courses/${course.courseId}/preview/${course.revisionId}`);
  });

  it("renders blockers, revision-bound review evidence, and publication history without calculating state in the component", () => {
    render(<GovernanceView detail={detail} />);
    expect(screen.getByText("Current Sahaja Review approval is required.")).toBeInTheDocument();
    expect(screen.getByText("language review: approved")).toBeInTheDocument();
    expect(screen.getByText("Revision version 2 by admin@example.test")).toBeInTheDocument();
    expect(screen.getByText("unpublished")).toBeInTheDocument();
  });

  it("renders a learner-shaped Greek preview without learner mutation controls", () => {
    render(<AdminPreview model={preview} />);
    expect(screen.getByText("Ελληνική περίληψη").closest("div")).toHaveAttribute("lang", "el");
    expect(screen.getByText(/Οδηγός — Required/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("uses the accessible destructive confirmation dialog and restores focus on cancel", () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    render(<ConfirmLifecycle action="/admin/courses/course/unpublish" label="Unpublish course" title="Unpublish this course?" />);
    const trigger = screen.getByRole("button", { name: "Unpublish course" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Unpublish this course?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(trigger).toHaveFocus();
    requestSubmit.mockRestore();
  });
});