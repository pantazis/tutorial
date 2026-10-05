import Link from "next/link";

import { EmptyState, ProgressSummary, StatusBadge, Timestamp } from "@/components/ui";
import type { Locale } from "@/i18n";
import type { LearnerProgressView } from "@/server/learner-utilities/types";
import type { Notification } from "@/server/notifications/types";

import type { LearnerUtilitiesCopy } from "../copy";
import styles from "./LearnerUtilities.module.scss";

export { styles as learnerUtilitiesStyles };

export function ProgressHistory({ copy, locale, progress }: { copy: LearnerUtilitiesCopy; locale: Locale; progress: LearnerProgressView }) {
  return (
    <div className={styles.sections}>
      <section aria-labelledby="course-progress-heading">
        <h2 id="course-progress-heading">{copy.coursesHeading}</h2>
        {progress.courses.length === 0 ? <EmptyState title={copy.noProgressTitle}><p>{copy.noProgressDetail}</p></EmptyState> : (
          <ul className={styles.list}>
            {progress.courses.map((course) => (
              <li className={styles.item} key={course.generationId}>
                <h3>{course.title}</h3>
                <div className={styles.meta}>
                  <StatusBadge label={course.isActive ? copy.activeGeneration : copy.historicalGeneration} tone={course.isActive ? "information" : "warning"} />
                  <span>{copy.generation} {course.generationNumber}</span>
                  <span lang={course.language.toLowerCase()}>{course.language}</span>
                </div>
                <ProgressSummary label={copy.coursesHeading} percentage={course.percentage} />
                <p>{copy.started}: <Timestamp date={course.startedAt} locale={locale} /></p>
                <p>{course.completedAt ? <>{copy.completed}: <Timestamp date={course.completedAt} locale={locale} /></> : copy.inProgress}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="progress-history-heading">
        <h2 id="progress-history-heading">{copy.historyHeading}</h2>
        {progress.events.length === 0 ? <EmptyState title={copy.noHistoryTitle}><p>{copy.noHistoryDetail}</p></EmptyState> : (
          <ol className={styles.list}>
            {progress.events.map((event) => (
              <li className={styles.item} key={event.id}>
                <h3>{copy[`event_${event.action}`]}</h3>
                <p>{[event.courseTitle, event.lessonTitle, event.itemTitle].filter(Boolean).join(" — ")}</p>
                <Timestamp date={event.occurredAt} locale={locale} />
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-labelledby="quiz-history-heading">
        <h2 id="quiz-history-heading">{copy.attemptsHeading}</h2>
        {progress.quizAttempts.length === 0 ? <EmptyState title={copy.noAttemptsTitle}><p>{copy.noAttemptsDetail}</p></EmptyState> : (
          <ol className={styles.list}>
            {progress.quizAttempts.map((attempt) => (
              <li className={styles.item} key={attempt.id}>
                <h3>{attempt.itemTitle}</h3>
                <p>{attempt.courseTitle}</p>
                <div className={styles.meta}>
                  <span>{copy.cycle} {attempt.cycleNumber}</span>
                  <span>{copy.attempt} {attempt.attemptNumber}</span>
                  <StatusBadge label={attempt.passed === true ? copy.passed : attempt.passed === false ? copy.notPassed : copy.openAttempt} tone={attempt.passed ? "success" : attempt.passed === false ? "warning" : "information"} />
                </div>
                <p>{copy.score}: {attempt.scorePercentage === null ? "—" : `${attempt.scorePercentage}%`}</p>
                <Timestamp date={attempt.submittedAt ?? attempt.startedAt} locale={locale} />
                {attempt.submittedAt ? <Link href={`/${locale}/courses/${attempt.courseId}/lessons/${attempt.lessonId}/items/${attempt.itemId}/result/${attempt.id}`}>{copy.viewAttempt}</Link> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function NotificationList({ copy, locale, notifications }: { copy: LearnerUtilitiesCopy; locale: Locale; notifications: Notification[] }) {
  if (notifications.length === 0) return <EmptyState title={copy.noNotificationsTitle}><p>{copy.noNotificationsDetail}</p></EmptyState>;
  return (
    <ol className={styles.list}>
      {notifications.map((notification) => {
        const title = typeof notification.detail.title === "string" ? notification.detail.title : null;
        const scope = typeof notification.detail.scope === "string" ? notification.detail.scope : null;
        return (
          <li className={styles.item} key={notification.id}>
            <h2>{copy[`notification_${notification.eventType}`]}</h2>
            {title ? <p>{copy.notificationCourse}: <span lang={notification.language.toLowerCase()}>{title}</span></p> : null}
            {scope ? <p>{copy.notificationScope}: {scope}</p> : null}
            <Timestamp date={notification.createdAt} locale={locale} />
          </li>
        );
      })}
    </ol>
  );
}