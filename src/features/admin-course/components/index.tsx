import Link from "next/link";

import { EmptyState, StatusBadge, Timestamp } from "@/components/ui";
import type { AdminCourseDetail, AdminCourseListEntry, CourseReadModel } from "@/server/course/types";

import styles from "./AdminCourse.module.scss";

export { CourseEditor, LessonEditor } from "./AdminEditors";
export { styles as adminCourseStyles };

const tone = (status: AdminCourseListEntry["lifecycleStatus"]) => status === "published" ? "success" : status === "archived" ? "warning" : "information";

export function AdminCourseList({ courses }: { courses: AdminCourseListEntry[] }) {
  if (!courses.length) return <EmptyState title="No courses"><p>No courses match this language filter.</p></EmptyState>;
  return <ul className={styles.list} data-columns="two">{courses.map((course) => <li className={styles.card} key={course.courseId} lang={course.language.toLowerCase()}><div className={styles.meta}><StatusBadge label={course.lifecycleStatus} tone={tone(course.lifecycleStatus)} /><span>{course.language}</span><span>Order {course.adminOrder}</span><span>Revision {course.revisionNumber}, version {course.version}</span></div><h2>{course.title}</h2><div className={styles.actions}><Link className={styles.action} href={`/admin/courses/${course.courseId}`}>Edit course</Link><Link className={`${styles.action} ${styles.secondary}`} href={`/admin/courses/${course.courseId}/governance`}>Governance</Link><Link className={`${styles.action} ${styles.secondary}`} href={`/admin/courses/${course.courseId}/preview/${course.revisionId}`}>Preview</Link></div></li>)}</ul>;
}

export function GovernanceView({ detail }: { detail: AdminCourseDetail }) {
  return <div className={styles.sections}>
    <section className={`${styles.panel} ${styles.blockers}`}><h2>Publication blockers</h2>{detail.blockers.length ? <ul>{detail.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>No current blockers. Publishing remains a separate explicit action.</p>}</section>
    <section><h2>Review evidence</h2>{detail.reviews.length ? <ol className={styles.timeline}>{detail.reviews.map((review) => <li className={styles.timelineItem} key={review.id}><strong>{review.reviewType} review: {review.decision}</strong><span>Revision version {review.revisionVersion} by {review.reviewerEmail}</span><p>{review.notes}</p><Timestamp date={review.decidedAt} locale="en" /></li>)}</ol> : <EmptyState title="No review evidence"><p>Record revision-bound Language and Sahaja decisions below.</p></EmptyState>}</section>
    <section><h2>Publication history</h2>{detail.publicationHistory.length ? <ol className={styles.timeline}>{detail.publicationHistory.map((entry) => <li className={styles.timelineItem} key={entry.id}><strong>{entry.action}</strong><span>{entry.actorEmail}</span><Timestamp date={entry.occurredAt} locale="en" /></li>)}</ol> : <EmptyState title="No publication history"><p>This course has not been published.</p></EmptyState>}</section>
  </div>;
}

export function AdminPreview({ model }: { model: CourseReadModel }) {
  return <div className={styles.sections} lang={model.language.toLowerCase()}><p>{model.summary}</p><section className={styles.panel}><h2>Source</h2><p><strong>{model.source.title}</strong></p><p>{model.source.attribution}</p></section><section><h2>Course outline</h2><ol className={styles.outline}>{model.outline.map((node, index) => <li className={styles.outlineItem} key={`${node.type}-${index}`}><h3>{node.title}</h3><p>{node.summary}</p>{node.lessons.map((lesson) => <article className={styles.panel} key={lesson.id}><h4>{lesson.title}</h4><p>{lesson.summary}</p><ul>{lesson.items.map((item) => <li key={item.id}>{item.title} — {item.required ? "Required" : "Optional"} ({item.type.replaceAll("_", " ")})</li>)}</ul></article>)}</li>)}</ol></section></div>;
}