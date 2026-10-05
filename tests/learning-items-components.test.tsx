import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AttemptHistory, LearningItemContent, QuizPanel, QuizResult } from "@/features/learning/components";
import type { LearnerItemView } from "@/server/learning/types";
import type { QuizAttempt, QuizLearnerState } from "@/server/quiz/types";

const itemId = "44444444-4444-4444-8444-444444444444";
const view: LearnerItemView = {
  course: {
    courseId: "11111111-1111-4111-8111-111111111111",
    revisionId: "22222222-2222-4222-8222-222222222222",
    language: "EN",
    title: "Course",
    summary: "Course summary",
    cover: { kind: "fallback", uri: null, alt: "Cover", focalX: 50, focalY: 50 },
    status: "in_progress",
    percentage: 0,
    startedAt: new Date("2026-09-29T08:00:00Z"),
    completedAt: null,
    lessons: [],
  },
  lesson: {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Lesson",
    summary: "Lesson summary",
    position: 0,
    group: null,
    prerequisiteLessonIds: [],
    status: "in_progress",
    lockReason: null,
    percentage: 0,
    startedAt: new Date("2026-09-29T08:05:00Z"),
    completedAt: null,
    items: [],
  },
  item: { id: itemId, type: "quiz", title: "Knowledge check", summary: "Quiz summary", required: true, position: 0, meditationFormat: null, completedAt: null },
  endReached: false,
  content: { kind: "quiz" },
};
view.lesson.items = [view.item];

const attempt: QuizAttempt = {
  id: "55555555-5555-4555-8555-555555555555",
  cycleId: "66666666-6666-4666-8666-666666666666",
  cycleNumber: 1,
  attemptNumber: 1,
  passPercentage: 80,
  attemptLimit: 2,
  revealPolicy: "after_submission",
  startedAt: new Date("2026-09-29T09:00:00Z"),
  submittedAt: null,
  scorePercentage: null,
  passed: null,
  exhausted: false,
  nextEligibleAt: new Date("2026-09-29T09:00:00Z"),
  questions: [
    { id: "77777777-7777-4777-8777-777777777777", type: "single_choice", prompt: "Single question", position: 0, options: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", label: "One", position: 0 }, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", label: "Two", position: 1 }] },
    { id: "88888888-8888-4888-8888-888888888888", type: "multiple_choice", prompt: "Multiple question", position: 1, options: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", label: "Alpha", position: 0 }, { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", label: "Beta", position: 1 }] },
    { id: "99999999-9999-4999-8999-999999999999", type: "true_false", prompt: "True false question", position: 2, options: [{ id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1", label: "True", position: 0 }, { id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2", label: "False", position: 1 }] },
  ],
  selectedOptionIds: null,
  correctOptionIds: null,
};

describe("learning item presentation", () => {
  it("does not expose Complete Tutorial before server-confirmed end eligibility", () => {
    render(<LearningItemContent locale="en" view={{ ...view, item: { ...view.item, type: "tutorial" }, content: { kind: "tutorial", body: "First block\n\nSecond block" } }} />);
    expect(screen.getByText("First block")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Tutorial" })).not.toBeInTheDocument();
  });

  it("presents accessible media transcript, captions, fallback, and attribution", () => {
    render(<LearningItemContent locale="en" view={{ ...view, item: { ...view.item, type: "guided_meditation", meditationFormat: "video" }, content: { kind: "meditation", format: "video", body: null, mediaUri: "/media/video.mp4", transcript: "Accessible transcript", captionsUri: "/media/captions.vtt", directFallbackUri: "/media/direct.mp4", attribution: "Approved source" } }} />);
    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Captions" })).toHaveAttribute("href", "/media/captions.vtt");
    expect(screen.getByRole("link", { name: "Direct media fallback" })).toHaveAttribute("href", "/media/direct.mp4");
    expect(screen.getByText(/Approved source/)).toBeInTheDocument();
  });

  it("renders all supported question controls and announces every unanswered question", () => {
    const state: QuizLearnerState = { attempts: [attempt], activeAttempt: attempt, canStart: false, passed: false, exhausted: false, waitKind: null, nextEligibleAt: null };
    render(<QuizPanel locale="en" state={state} view={view} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    fireEvent.submit(screen.getByRole("button", { name: "Submit attempt" }).closest("form")!);
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Answer every question")).toBeInTheDocument();
    expect(within(alert).getAllByText("This question needs an answer.")).toHaveLength(3);
  });

  it("shows reveal-aware results and immutable cycle history facts", () => {
    const submitted = { ...attempt, submittedAt: new Date("2026-09-29T09:10:00Z"), scorePercentage: 67, passed: false, selectedOptionIds: {}, correctOptionIds: { [attempt.questions[0].id]: [attempt.questions[0].options[0].id], [attempt.questions[1].id]: [attempt.questions[1].options[0].id], [attempt.questions[2].id]: [attempt.questions[2].options[0].id] } };
    const { rerender } = render(<QuizResult attempt={submitted} locale="en" />);
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Correct answers under the configured reveal policy")).toBeInTheDocument();
    rerender(<AttemptHistory attempts={[submitted]} basePath="/en/course/item" locale="en" />);
    expect(screen.getByText("Cycle 1, Attempt 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View result" })).toHaveAttribute("href", `/en/course/item/result/${attempt.id}`);
  });
});