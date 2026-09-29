import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import {
  AdminShell,
  CourseShell,
  LearnerShell,
  PreviewShell,
  PublicShell,
} from "@/components/shells";
import {
  FormErrorSummary,
  ConfirmDialog,
  ProgressSummary,
  RequirementLabel,
  ResultNotice,
  StatusBadge,
  TypedStateNotice,
} from "@/components/ui";
import type { AuthenticatedContext } from "@/server/auth/types";

const userContext: AuthenticatedContext = {
  accountId: "account-user",
  email: "learner@example.test",
  language: "EL",
  role: "user",
  sessionId: "session-user",
};

const adminContext: AuthenticatedContext = {
  ...userContext,
  accountId: "account-admin",
  email: "admin@example.test",
  language: "EN",
  role: "admin",
};

const masterContext: AuthenticatedContext = {
  ...adminContext,
  accountId: "account-master",
  email: "master@example.test",
  role: "master_admin",
};

describe("application baseline", () => {
  it("renders one shell-owned main landmark and descriptive page heading", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Advanced learning" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("uses one localized tree and suppresses language switching inside a course", () => {
    const { rerender } = render(
      <PublicShell locale="el" title="Προχωρημένη μάθηση">
        <p>Περιεχόμενο</p>
      </PublicShell>,
    );

    expect(screen.getByRole("main").closest("[lang]")).toHaveAttribute("lang", "el");
    expect(screen.getByRole("navigation", { name: "Γλώσσα" })).toBeInTheDocument();

    rerender(
      <CourseShell
        courseLanguage="EL"
        courseHref="/el/courses/course-1"
        courseTitle="Μάθημα"
        title="Επισκόπηση ενότητας"
      >
        <p>Περιεχόμενο</p>
      </CourseShell>,
    );

    expect(screen.queryByRole("navigation", { name: "Γλώσσα" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Επιστροφή στο μάθημα/ })).toBeInTheDocument();
  });

  it("derives learner and administrator navigation from typed server context", () => {
    const { rerender } = render(
      <LearnerShell
        context={userContext}
        title="Το μάθημά μου"
      >
        <p>Περιεχόμενο</p>
      </LearnerShell>,
    );

    const learnerNav = screen.getByRole("navigation", { name: "Κύρια πλοήγηση" });
    expect(within(learnerNav).getByRole("link", { name: "Η πρόοδός μου" })).toBeInTheDocument();
    expect(within(learnerNav).queryByText("Administration")).not.toBeInTheDocument();

    rerender(
      <AdminShell context={adminContext} title="Administration">
        <p>Content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("main").closest("[lang]")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("link", { name: "Courses" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administrator Management" })).not.toBeInTheDocument();

    rerender(
      <AdminShell context={masterContext} title="Administration">
        <p>Content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: "Administrator Management" })).toBeInTheDocument();

    rerender(
      <AdminShell
        context={{ ...masterContext, language: "EL" }}
        title="Administration"
      >
        <p>Content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: "My Course" })).toHaveAttribute("href", "/el/courses");
  });

  it("fails closed when an administrative shell receives learner context", () => {
    expect(() =>
      render(
        <AdminShell context={userContext} title="Administration">
          <p>Content</p>
        </AdminShell>,
      ),
    ).toThrow("Administrative shell requires an authorized server context.");
  });

  it("keeps preview English-only and unmistakably read-only", () => {
    render(
      <PreviewShell
        context={adminContext}
        courseHref="/admin/courses/course-1"
        title="Course preview"
      >
        <p lang="el">Ελληνικό περιεχόμενο</p>
      </PreviewShell>,
    );

    expect(screen.getByRole("main").closest("[lang]")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("status")).toHaveTextContent("Read-only preview");
    expect(screen.queryByRole("navigation", { name: "Language" })).not.toBeInTheDocument();
  });

  it("renders supplied facts and persistent linked error semantics without domain calculations", () => {
    render(
      <>
        <StatusBadge label="Completed" tone="success" />
        <RequirementLabel label="Required" required />
        <ProgressSummary label="Course progress" percentage={37} />
        <ResultNotice
          detail="Your previous information remains unchanged."
          heading="Could not save"
          nextAction="Review the form and try again."
          tone="danger"
        />
        <FormErrorSummary
          errors={[{ fieldId: "email", message: "Enter a valid email address." }]}
          heading="There is a problem"
        />
        <label htmlFor="email">Email</label>
        <input id="email" />
      </>,
    );

    expect(screen.getByRole("progressbar", { name: "Course progress: 37%" })).toHaveAttribute(
      "aria-valuenow",
      "37",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Enter a valid email address." })).toHaveAttribute(
      "href",
      "#email",
    );
  });

  it("renders denied states without resource-identifying details", () => {
    render(
      <TypedStateNotice
        heading="Unavailable"
        state={{
          kind: "denied",
          message: "This page is unavailable.",
          safeNextAction: "Return to My Course.",
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("This page is unavailable.");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/course-|account-|lesson-/i);
  });

  it("contains destructive confirmation focus and supports safe Escape cancellation", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Confirm reset"
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Confirm reset"
      >
        <p>This action preserves history.</p>
      </ConfirmDialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Confirm reset" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Confirm reset" });
    expect(cancel).toHaveFocus();

    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});