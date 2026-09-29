import type { ReactNode } from "react";

import styles from "./SemanticState.module.scss";

export type StateTone = "success" | "warning" | "danger" | "information";

export function StatusBadge({ label, tone }: { label: string; tone: StateTone }) {
  return (
    <span className={styles.badge} data-state-tone={tone}>
      {label}
    </span>
  );
}

export function RequirementLabel({
  label,
  required,
}: {
  label: string;
  required: boolean;
}) {
  return (
    <span className={styles.requirement} data-state-tone={required ? "warning" : "information"}>
      {label}
    </span>
  );
}

export function ProgressSummary({ label, percentage }: { label: string; percentage: number }) {
  return (
    <section aria-label={label} className={styles.progress}>
      <strong>{label}</strong>
      <span> — {percentage}%</span>
      <div
        aria-label={`${label}: ${percentage}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className={styles.progressTrack}
        role="progressbar"
      >
        <div className={styles.progressValue} style={{ inlineSize: `${percentage}%` }} />
      </div>
    </section>
  );
}

export function Timestamp({ date, locale }: { date: Date | string; locale: "el" | "en" }) {
  const value = typeof date === "string" ? date : date.toISOString();
  return (
    <time className={styles.timestamp} dateTime={value}>
      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )}
    </time>
  );
}

export function EmptyState({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className={styles.empty} data-state="empty">
      <h2 className={styles.heading}>{title}</h2>
      {children}
    </section>
  );
}

export function ResultNotice({
  detail,
  heading,
  nextAction,
  tone,
}: {
  detail: ReactNode;
  heading: string;
  nextAction: ReactNode;
  tone: StateTone;
}) {
  return (
    <section
      aria-atomic="true"
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={styles.notice}
      data-state-tone={tone}
      role={tone === "danger" ? "alert" : "status"}
      tabIndex={-1}
    >
      <h2 className={styles.heading}>{heading}</h2>
      <div>{detail}</div>
      <div className={styles.detail}>{nextAction}</div>
    </section>
  );
}

export type FieldError = { fieldId: string; message: string };

export function FormErrorSummary({ errors, heading }: { errors: readonly FieldError[]; heading: string }) {
  return (
    <section
      aria-labelledby="form-error-heading"
      className={styles.errorSummary}
      data-state-tone="danger"
      role="alert"
      tabIndex={-1}
    >
      <h2 className={styles.heading} id="form-error-heading">
        {heading}
      </h2>
      <ul>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type UnavailableState = {
  kind: "loading" | "empty" | "transient" | "stale" | "rate_limited";
  message: string;
  safeNextAction: string;
};

export type DeniedState = {
  kind: "denied";
  message: string;
  safeNextAction: string;
};

export function TypedStateNotice({
  heading,
  state,
}: {
  heading: string;
  state: UnavailableState | DeniedState;
}) {
  return (
    <ResultNotice
      detail={state.message}
      heading={heading}
      nextAction={state.safeNextAction}
      tone={state.kind === "denied" ? "danger" : "information"}
    />
  );
}

export { ConfirmDialog } from "./ConfirmDialog";