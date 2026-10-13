import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ActivityReport,
  ConfirmAdminAction,
  ConfirmReset,
  ImpactPreview,
  LearnerResults,
} from "@/features/admin-oversight/components";
import type { ResetPreview } from "@/server/reset/types";

const preview: ResetPreview = {
  previewId: "11111111-1111-4111-8111-111111111111",
  fingerprint: "preview-fingerprint",
  expiresAt: new Date("2026-10-12T14:00:00.000Z"),
  impact: {
    learnerAccountId: "22222222-2222-4222-8222-222222222222",
    courseId: "33333333-3333-4333-8333-333333333333",
    scope: "lesson",
    targetId: "44444444-4444-4444-8444-444444444444",
    waitSeconds: 0,
    generationId: "55555555-5555-4555-8555-555555555555",
    revisionId: "66666666-6666-4666-8666-666666666666",
    affectedLessonIds: [
      "44444444-4444-4444-8444-444444444444",
      "77777777-7777-4777-8777-777777777777",
    ],
    affectedItemIds: ["88888888-8888-4888-8888-888888888888"],
    activeCycleIds: [],
    completedLessonIds: ["44444444-4444-4444-8444-444444444444"],
    completedItemIds: ["88888888-8888-4888-8888-888888888888"],
    quizAttemptIds: ["99999999-9999-4999-8999-999999999999"],
    coursePercentage: 50,
  },
};

describe("administrative oversight presentation", () => {
  it("renders no-result states and factual aggregate data in named contained regions", () => {
    const { rerender } = render(<LearnerResults learners={[]} />);
    expect(screen.getByRole("heading", { name: "No learners found" })).toBeInTheDocument();

    rerender(<ActivityReport rows={[{
      courseId: preview.impact.courseId,
      language: "EL",
      title: "Ελληνικό μάθημα",
      activeLearners: 4,
      completedLearners: 2,
      attemptCount: 7,
    }]} />);
    const region = screen.getByRole("region", { name: "Course activity report" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(within(region).getByText("Ελληνικό μάθημα")).toHaveAttribute("lang", "el");
    expect(within(region).getByText("7")).toBeInTheDocument();
    expect(screen.queryByText(/rank|score|quality/iu)).not.toBeInTheDocument();
  });

  it("shows the server-calculated reset impact and stale-preview warning", () => {
    render(<ImpactPreview preview={preview} />);
    expect(screen.getByRole("heading", { name: "Server-calculated impact" })).toBeInTheDocument();
    expect(screen.getByText("2 lesson record(s) affected, including dependents.")).toBeInTheDocument();
    expect(screen.getByText("1 historical quiz attempt(s) preserved.")).toBeInTheDocument();
    expect(screen.getByText(/Confirmation will recompute this impact and reject any mismatch/u)).toBeInTheDocument();
  });

  it("requires a reset reason, submits the server preview fields, and restores focus on cancel", () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    render(<ConfirmReset action="/admin/learners/learner/reset/confirm" fingerprint={preview.fingerprint} previewId={preview.previewId} />);

    const reason = screen.getByLabelText("Required reason");
    expect(reason).toHaveAttribute("form", "confirm-reset-form");
    expect(reason).toBeRequired();
    expect(screen.getByDisplayValue(preview.previewId)).toHaveAttribute("name", "previewId");
    expect(screen.getByDisplayValue(preview.fingerprint)).toHaveAttribute("name", "fingerprint");

    const trigger = screen.getByRole("button", { name: "Confirm reset" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Apply this reset impact?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(trigger).toHaveFocus();
    requestSubmit.mockRestore();
  });

  it("uses explicit confirmation for master-only role changes", () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    render(
      <ConfirmAdminAction action="/admin/administrators/account/role" label="Revoke admin from admin@example.test" title="Revoke administrator access?">
        <input name="action" type="hidden" value="revoke" />
      </ConfirmAdminAction>,
    );

    const trigger = screen.getByRole("button", { name: "Revoke admin from admin@example.test" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Revoke administrator access?" })).toBeInTheDocument();
    expect(screen.getByText(/Master administrator membership cannot be changed here/u)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(trigger).toHaveFocus();
    requestSubmit.mockRestore();
  });
});