import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { EmptyState, ProgressSummary, RequirementLabel, StatusBadge, Timestamp } from "@/components/ui";
import type { Locale } from "@/i18n";
import type { CourseStatus, LearnerCatalogEntry, LearnerCourse, LearnerCourseCover, LearnerItem, LearnerLesson } from "@/server/learning/types";
import type { LearnerItemView } from "@/server/learning/types";
import type { QuizAttempt, QuizLearnerState } from "@/server/quiz/types";

import { courseStatusLabel, getLearningCopy, lessonStatusLabel } from "../copy";
import styles from "./Learning.module.scss";
import { MeditationEndControl, QuizAttemptForm, TutorialEndGate } from "./ItemInteractions";

const tone = (status: CourseStatus | LearnerLesson["status"]) =>
  status === "completed" ? "success" : status === "in_progress" ? "information" : status === "locked" ? "warning" : "information";

export function CourseCover({ cover, fallbackLabel }: { cover: LearnerCourseCover; fallbackLabel: string }) {
  const style = {
    "--cover-x": `${cover.focalX}%`,
    "--cover-y": `${cover.focalY}%`,
    ...(cover.kind === "uploaded" && cover.uri ? { backgroundImage: `url(${JSON.stringify(cover.uri)})` } : {}),
  } as CSSProperties;
  return (
    <div aria-label={cover.alt} className={styles.cover} role="img" style={style}>
      {cover.kind === "fallback" ? fallbackLabel : null}
    </div>
  );
}

export function CourseCard({ course, locale }: { course: LearnerCatalogEntry; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const coursePath = `/${locale}/courses/${course.courseId}`;
  return (
    <article className={styles.card}>
      <CourseCover cover={course.cover} fallbackLabel={copy.fallbackCover} />
      <div className={styles.meta}><StatusBadge label={courseStatusLabel(locale, course.status)} tone={tone(course.status)} /></div>
      <h3 className={styles.cardTitle}>{course.title}</h3>
      <p>{course.summary}</p>
      {course.status !== "available" ? <ProgressSummary label={copy.courseProgress} percentage={course.percentage} /> : null}
      <div className={styles.actions}>
        {course.status === "available" ? (
          <form action={`/${locale}/courses/${course.courseId}/start`} method="post">
            <button className={styles.button} type="submit">{copy.startCourse}</button>
          </form>
        ) : null}
        {course.status === "in_progress" ? (
          <form action={`/${locale}/courses/${course.courseId}/resume`} method="post">
            <button className={styles.button} type="submit">{copy.resume}</button>
          </form>
        ) : null}
        <Link className={`${styles.action} ${course.status !== "completed" ? styles.secondary : ""}`} href={coursePath}>
          {course.status === "completed" ? copy.review : course.status === "in_progress" ? copy.continue : copy.open}
        </Link>
      </div>
    </article>
  );
}

export function CourseStatusSection({ children, heading }: { children: ReactNode; heading: string }) {
  return <section><h2 className={styles.sectionHeading}>{heading}</h2><ul className={styles.cardGrid}>{children}</ul></section>;
}

export function CourseOutline({ course, locale }: { course: LearnerCourse; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const nodes: Array<{ key: string; title?: string; summary?: string; lessons: LearnerLesson[] }> = [];
  for (const lesson of course.lessons) {
    const key = lesson.group?.id ?? lesson.id;
    let node = nodes.find((candidate) => candidate.key === key);
    if (!node) {
      node = { key, title: lesson.group?.title, summary: lesson.group?.summary, lessons: [] };
      nodes.push(node);
    }
    node.lessons.push(lesson);
  }
  return (
    <section className={styles.outline} aria-labelledby="course-outline-heading">
      <h2 className={styles.sectionHeading} id="course-outline-heading">{copy.courseOutline}</h2>
      {nodes.map((node) => node.title ? (
        <section className={styles.group} key={node.key}>
          <h3 className={styles.groupHeading}>{node.title}</h3><p>{node.summary}</p>
          {node.lessons.map((lesson) => <LessonCard course={course} key={lesson.id} lesson={lesson} locale={locale} />)}
        </section>
      ) : node.lessons.map((lesson) => <LessonCard course={course} key={lesson.id} lesson={lesson} locale={locale} />))}
    </section>
  );
}

export function LessonCard({ course, lesson, locale }: { course: LearnerCourse; lesson: LearnerLesson; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const accessible = Boolean(course.startedAt) && lesson.status !== "locked";
  return (
    <article className={`${styles.lessonCard} ${lesson.status === "locked" ? styles.locked : ""}`}>
      <div className={styles.meta}><StatusBadge label={lessonStatusLabel(locale, lesson.status)} tone={tone(lesson.status)} /></div>
      <h3 className={styles.cardTitle}>{lesson.title}</h3>
      <p>{lesson.summary}</p>
      {lesson.status === "in_progress" || lesson.status === "completed" ? <ProgressSummary label={copy.lessonProgress} percentage={lesson.percentage} /> : null}
      {lesson.status === "locked" ? <p className={styles.reason}>{copy.prerequisiteReason}</p> : !course.startedAt ? <p className={styles.reason}>{copy.startCourseFirst}</p> : null}
      {accessible ? <Link className={styles.action} href={`/${locale}/courses/${course.courseId}/lessons/${lesson.id}`}>{lesson.status === "completed" ? copy.review : copy.open}</Link> : null}
    </article>
  );
}

export function LessonItemList({ course, lesson, locale }: { course: LearnerCourse; lesson: LearnerLesson; locale: Locale }) {
  const copy = getLearningCopy(locale);
  return (
    <section className={styles.items} aria-labelledby="lesson-items-heading">
      <h2 className={styles.sectionHeading} id="lesson-items-heading">{copy.learningPoints}</h2>
      {lesson.items.map((item) => <LessonItem course={course} item={item} key={item.id} lesson={lesson} locale={locale} />)}
    </section>
  );
}

function LessonItem({ course, item, lesson, locale }: { course: LearnerCourse; item: LearnerItem; lesson: LearnerLesson; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const content = <><span>{copy[item.type]}</span>: {item.title}</>;
  return (
    <article className={styles.item}>
      <div className={styles.meta}>
        <RequirementLabel label={item.required ? copy.required : copy.optional} required={item.required} />
        {item.completedAt ? <StatusBadge label={copy.completed} tone="success" /> : null}
      </div>
      <h3 className={styles.itemTitle}>
        {lesson.startedAt ? <Link className={styles.itemLink} href={`/${locale}/courses/${course.courseId}/lessons/${lesson.id}/items/${item.id}`}>{content}</Link> : content}
      </h3>
      <p>{item.summary}</p>
    </article>
  );
}

export function LessonNavigation({ course, lesson, locale }: { course: LearnerCourse; lesson: LearnerLesson; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const index = course.lessons.findIndex((candidate) => candidate.id === lesson.id);
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  const link = (candidate: LearnerLesson | undefined, label: string) => candidate && candidate.status !== "locked" && course.startedAt
    ? <Link className={`${styles.action} ${styles.secondary}`} href={`/${locale}/courses/${course.courseId}/lessons/${candidate.id}`}>{label}: {candidate.title}</Link>
    : null;
  return <nav aria-label={copy.learningPoints} className={styles.navigation}>{link(previous, copy.previousLesson)}{link(next, copy.nextLesson)}</nav>;
}

function bodyBlocks(body: string) {
  return body.split(/\n\s*\n/u).map((block) => block.trim()).filter(Boolean);
}

export function ContentBlocks({ body }: { body: string }) {
  return <div className={styles.contentBlocks}>{bodyBlocks(body).map((block, index) => <section className={styles.contentBlock} key={`${index}:${block.slice(0, 24)}`}><p className={styles.prose}>{block}</p></section>)}</div>;
}

export function LearningItemContent({ locale, view }: { locale: Locale; view: LearnerItemView }) {
  const copy = getLearningCopy(locale);
  const base = `/${locale}/courses/${view.course.courseId}/lessons/${view.lesson.id}/items/${view.item.id}`;
  if (view.content.kind === "tutorial") {
    return <><ContentBlocks body={view.content.body} /><TutorialEndGate completeAction={`${base}/complete`} copy={copy} endAction={`${base}/end`} endReached={view.endReached} /></>;
  }
  if (view.content.kind === "meditation") {
    return (
      <section className={styles.mediaFrame}>
        {view.content.body ? <ContentBlocks body={view.content.body} /> : null}
        <MeditationEndControl action={`${base}/complete`} captionsUri={view.content.captionsUri} copy={copy} format={view.content.format} mediaUri={view.content.mediaUri} />
        {view.content.transcript ? <details><summary>{copy.transcript}</summary><p className={styles.prose}>{view.content.transcript}</p></details> : null}
        {view.content.captionsUri ? <p><a href={view.content.captionsUri}>{copy.captions}</a></p> : null}
        {view.content.directFallbackUri ? <p><a href={view.content.directFallbackUri}>{copy.directFallback}</a></p> : null}
        {!view.content.mediaUri && view.content.format !== "text" ? <p>{copy.mediaUnavailable}</p> : null}
        <p><strong>{copy.attribution}:</strong> {view.content.attribution}</p>
      </section>
    );
  }
  return null;
}

export function ItemNavigation({ locale, view }: { locale: Locale; view: LearnerItemView }) {
  const copy = getLearningCopy(locale);
  const index = view.lesson.items.findIndex((item) => item.id === view.item.id);
  const itemLink = (item: LearnerItem | undefined, label: string) => item
    ? <Link className={`${styles.action} ${styles.secondary}`} href={`/${locale}/courses/${view.course.courseId}/lessons/${view.lesson.id}/items/${item.id}`}>{label}: {item.title}</Link>
    : null;
  return (
    <nav aria-label={copy.learningPoints} className={styles.navigation}>
      <Link className={`${styles.action} ${styles.secondary}`} href={`/${locale}/courses/${view.course.courseId}/lessons/${view.lesson.id}`}>{copy.backToLesson}</Link>
      {itemLink(view.lesson.items[index - 1], copy.previousItem)}
      {itemLink(view.lesson.items[index + 1], copy.nextItem)}
    </nav>
  );
}

export function QuizPanel({ locale, state, view }: { locale: Locale; state: QuizLearnerState; view: LearnerItemView }) {
  const copy = getLearningCopy(locale);
  const base = `/${locale}/courses/${view.course.courseId}/lessons/${view.lesson.id}/items/${view.item.id}`;
  if (state.activeAttempt) return <QuizAttemptForm action={`${base}/quiz/submit`} attempt={state.activeAttempt} copy={copy} />;
  const latest = [...state.attempts].reverse().find((attempt) => attempt.submittedAt);
  return (
    <section className={styles.quiz}>
      {state.passed ? <p>{copy.quizPassedLocked}</p> : null}
      {state.waitKind === "timed" && state.nextEligibleAt ? <p>{copy.timedWait} <Timestamp date={state.nextEligibleAt} locale={locale} />.</p> : null}
      {state.waitKind === "administrator" ? <p>{copy.administratorReset}</p> : null}
      {state.canStart ? <form action={`${base}/quiz/start`} method="post"><button className={styles.button} type="submit">{latest ? copy.tryAgain : copy.startQuiz}</button></form> : null}
      {latest ? <Link className={styles.action} href={`${base}/result/${latest.id}`}>{copy.viewResult}</Link> : null}
      <Link className={`${styles.action} ${styles.secondary}`} href={`${base}/history`}>{copy.attemptHistory}</Link>
    </section>
  );
}

export function QuizResult({ attempt, locale }: { attempt: QuizAttempt; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const remaining = attempt.attemptLimit === null ? null : Math.max(0, attempt.attemptLimit - attempt.attemptNumber);
  return (
    <section aria-live="polite" className={styles.quiz}>
      <h2>{copy.quizResult}</h2>
      <StatusBadge label={attempt.passed ? copy.passed : copy.failed} tone={attempt.passed ? "success" : "warning"} />
      <p><strong>{copy.score}:</strong> {attempt.scorePercentage}%</p>
      <p><strong>{copy.passRequired}:</strong> {attempt.passPercentage}%</p>
      <p>{remaining === null ? copy.unlimitedAttempts : `${copy.attemptsRemaining}: ${remaining}`}</p>
      {attempt.correctOptionIds ? (
        <section><h3>{copy.correctAnswers}</h3>{attempt.questions.map((question) => <div className={styles.answerState} key={question.id}><strong>{question.prompt}</strong><ul>{question.options.filter((option) => attempt.correctOptionIds?.[question.id]?.includes(option.id)).map((option) => <li key={option.id}>{option.label}</li>)}</ul></div>)}</section>
      ) : <p>{copy.answersNotRevealed}</p>}
    </section>
  );
}

export function AttemptHistory({ attempts, basePath, locale }: { attempts: QuizAttempt[]; basePath: string; locale: Locale }) {
  const copy = getLearningCopy(locale);
  const submitted = attempts.filter((attempt) => attempt.submittedAt);
  if (submitted.length === 0) return <EmptyState title={copy.attemptHistory}><p>{copy.historyEmpty}</p></EmptyState>;
  return (
    <section className={styles.history}>
      <h2>{copy.attemptHistory}</h2>
      <ol className={styles.historyList}>{submitted.map((attempt) => <li className={styles.historyItem} key={attempt.id}><strong>{copy.cycle} {attempt.cycleNumber}, {copy.attempt} {attempt.attemptNumber}</strong><span>{copy.score}: {attempt.scorePercentage}% — {attempt.passed ? copy.passed : copy.failed}</span>{attempt.submittedAt ? <Timestamp date={attempt.submittedAt} locale={locale} /> : null}<Link href={`${basePath}/result/${attempt.id}`}>{copy.viewResult}</Link></li>)}</ol>
    </section>
  );
}

export const learningStyles = styles;