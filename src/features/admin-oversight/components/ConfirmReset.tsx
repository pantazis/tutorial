"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import styles from "./AdminOversight.module.scss";

export function ConfirmReset({ action, fingerprint, previewId }: { action: string; fingerprint: string; previewId: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div className={styles.form}><label htmlFor="reset-reason">Required reason</label><textarea form="confirm-reset-form" id="reset-reason" maxLength={1000} minLength={1} name="reason" required /><div className={styles.actions}><button className={`${styles.button} ${styles.danger}`} onClick={() => setOpen(true)} ref={triggerRef} type="button">Confirm reset</button><Link className={`${styles.action} ${styles.secondary}`} href={action.replace(/\/confirm$/u, "")}>Cancel</Link></div><form action={action} id="confirm-reset-form" method="post"><input name="previewId" type="hidden" value={previewId} /><input name="fingerprint" type="hidden" value={fingerprint} /></form>{open ? <ConfirmDialog cancelLabel="Cancel" confirmLabel="Confirm reset" onCancel={() => setOpen(false)} onConfirm={() => (document.getElementById("confirm-reset-form") as HTMLFormElement | null)?.requestSubmit()} returnFocusRef={triggerRef} title="Apply this reset impact?"><p>The server will recalculate the impact before changing current progress. History and unrelated progress remain preserved.</p></ConfirmDialog> : null}</div>;
}