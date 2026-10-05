"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { FormErrorSummary } from "@/components/ui";
import type { LearningCopy } from "@/features/learning/copy";
import type { QuizAttempt } from "@/server/quiz/types";

import styles from "./Learning.module.scss";

export function TutorialEndGate({ endAction, completeAction, endReached, copy }: { endAction: string; completeAction: string; endReached: boolean; copy: LearningCopy }) {
  const marker = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (endReached || !marker.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPending(true);
        observer.disconnect();
        form.current?.requestSubmit();
      }
    }, { threshold: 0.8 });
    observer.observe(marker.current);
    return () => observer.disconnect();
  }, [endReached]);

  return (
    <div className={styles.endMarker} ref={marker}>
      <p>{copy.tutorialEnd}</p>
      {!endReached ? <form action={endAction} hidden method="post" ref={form} /> : null}
      {!endReached && pending ? <p aria-live="polite">{copy.completionPending}</p> : null}
      {endReached ? <form action={completeAction} method="post"><button className={styles.button} type="submit">{copy.completeTutorial}</button></form> : null}
    </div>
  );
}

export function MeditationEndControl({
  action,
  captionsUri,
  copy,
  format,
  mediaUri,
}: {
  action: string;
  captionsUri: string | null;
  copy: LearningCopy;
  format: "text" | "audio" | "video";
  mediaUri: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const complete = () => {
    if (pending) return;
    setPending(true);
    form.current?.requestSubmit();
  };

  useEffect(() => {
    if (format !== "text" || !marker.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        complete();
      }
    }, { threshold: 0.8 });
    observer.observe(marker.current);
    return () => observer.disconnect();
  });

  return (
    <>
      {format === "audio" && mediaUri ? <audio className={styles.media} controls onEnded={complete} preload="metadata" src={mediaUri} /> : null}
      {format === "video" && mediaUri ? (
        <video className={styles.media} controls onEnded={complete} preload="metadata">
          <source src={mediaUri} />
          {captionsUri ? <track default kind="captions" src={captionsUri} /> : null}
        </video>
      ) : null}
      <form action={action} method="post" ref={form}>
        <input name="signal" type="hidden" value={format === "text" ? "text_end" : "media_end"} />
      </form>
      {format === "text" ? <div className={styles.endMarker} ref={marker}>{pending ? copy.completionPending : copy.tutorialEnd}</div> : null}
      {format !== "text" && pending ? <p aria-live="polite">{copy.completionPending}</p> : null}
    </>
  );
}

export function QuizAttemptForm({ attempt, action, copy }: { attempt: QuizAttempt; action: string; copy: LearningCopy }) {
  const [unanswered, setUnanswered] = useState<string[]>([]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const missing = attempt.questions.filter((question) => data.getAll(`question:${question.id}`).length === 0).map((question) => question.id);
    if (missing.length > 0) {
      event.preventDefault();
      setUnanswered(missing);
      requestAnimationFrame(() => document.getElementById("quiz-errors")?.focus());
    }
  };
  return (
    <form action={action} className={styles.quiz} method="post" noValidate onSubmit={submit}>
      <input name="attemptId" type="hidden" value={attempt.id} />
      {unanswered.length > 0 ? <FormErrorSummary errors={unanswered.map((id) => ({ fieldId: `question-${id}`, message: copy.unansweredMessage }))} heading={copy.unansweredHeading} id="quiz-errors" /> : null}
      <p>{copy.quizInstructions}</p>
      {attempt.questions.map((question, index) => {
        const multiple = question.type === "multiple_choice";
        const instruction = multiple ? copy.multipleChoice : question.type === "true_false" ? copy.trueFalse : copy.singleChoice;
        return (
          <fieldset className={styles.question} id={`question-${question.id}`} key={question.id}>
            <legend>{index + 1}. {question.prompt}</legend>
            <p>{instruction}</p>
            <ul className={styles.options}>
              {question.options.map((option) => <li key={option.id}><label className={styles.option}><input name={`question:${question.id}`} type={multiple ? "checkbox" : "radio"} value={option.id} /> <span>{option.label}</span></label></li>)}
            </ul>
          </fieldset>
        );
      })}
      <button className={styles.button} type="submit">{copy.submitQuiz}</button>
    </form>
  );
}