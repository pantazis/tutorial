import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ProgressSummary, RequirementLabel, StatusBadge } from "@/components/ui";
import type { Locale } from "@/i18n";
import type { CourseStatus, LearnerCatalogEntry, LearnerCourse, LearnerCourseCover, LearnerItem, LearnerLesson } from "@/server/learning/types";

import { courseStatusLabel, getLearningCopy, lessonStatusLabel } from "../copy";
import styles from "./Learning.module.scss";

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

export const learningStyles = styles;