import Link from "next/link";
import type { ReactNode } from "react";

import { FormErrorSummary, type FieldError } from "@/components/ui";

import { FocusTarget } from "./FocusTarget";
import styles from "./AccountForm.module.scss";

export function AccountForm({
  action,
  children,
  errors = [],
  errorHeading,
  links = [],
  submitLabel,
}: {
  action: string;
  children?: ReactNode;
  errors?: readonly FieldError[];
  errorHeading: string;
  links?: readonly { href: string; label: string }[];
  submitLabel: string;
}) {
  return (
    <>
      {errors.length > 0 ? (
        <>
          <FocusTarget targetId="account-form-errors" />
          <FormErrorSummary errors={errors} heading={errorHeading} id="account-form-errors" />
        </>
      ) : null}
      <form action={action} className={styles.form} method="post" noValidate>
        <div className={styles.fields}>{children}</div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
      {links.length > 0 ? (
        <nav aria-label="Account options" className={styles.links}>
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}

export function AccountField({
  autoComplete,
  children,
  hint,
  id,
  label,
  maxLength,
  minLength,
  name,
  required = true,
  type = "text",
}: {
  autoComplete?: string;
  children?: ReactNode;
  hint?: string;
  id: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  required?: boolean;
  type?: "email" | "password" | "text";
}) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children ?? (
        <input
          aria-describedby={hintId}
          autoComplete={autoComplete}
          id={id}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          required={required}
          type={type}
        />
      )}
      {hint ? (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function PrimaryActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className={styles.actionLink} href={href}>
      {label}
    </Link>
  );
}