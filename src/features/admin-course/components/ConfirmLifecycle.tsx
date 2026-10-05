"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui";

import styles from "./AdminCourse.module.scss";

export function ConfirmLifecycle({ action, label, title }: { action: string; label: string; title: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <><button className={`${styles.button} ${styles.danger}`} onClick={() => setOpen(true)} ref={triggerRef} type="button">{label}</button>{open ? <ConfirmDialog cancelLabel="Cancel" confirmLabel={label} onCancel={() => setOpen(false)} onConfirm={() => (document.getElementById(`lifecycle-${label}`) as HTMLFormElement | null)?.requestSubmit()} returnFocusRef={triggerRef} title={title}><p>This changes learner availability but preserves revisions, progress, reviews, audit, and publication history.</p><form action={action} id={`lifecycle-${label}`} method="post" /></ConfirmDialog> : null}</>;
}