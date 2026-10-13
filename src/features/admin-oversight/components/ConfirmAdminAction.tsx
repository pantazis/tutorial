"use client";

import { useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui";
import styles from "./AdminOversight.module.scss";

export function ConfirmAdminAction({ action, children, label, title }: { action: string; children: ReactNode; label: string; title: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formId = `admin-action-${label.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-")}`;
  return <><button className={`${styles.button} ${styles.danger}`} onClick={() => setOpen(true)} ref={triggerRef} type="button">{label}</button><form action={action} id={formId} method="post">{children}</form>{open ? <ConfirmDialog cancelLabel="Cancel" confirmLabel={label} onCancel={() => setOpen(false)} onConfirm={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()} returnFocusRef={triggerRef} title={title}><p>This privileged action is reauthorized and audited by the server. Master administrator membership cannot be changed here.</p></ConfirmDialog> : null}</>;
}