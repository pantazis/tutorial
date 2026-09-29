import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale, Messages } from "@/i18n";

import styles from "./ShellFrame.module.scss";

export type NavigationItem = {
  href: string;
  label: string;
  current?: boolean;
};

type ShellFrameProps = {
  children: ReactNode;
  context?: ReactNode;
  feedback?: ReactNode;
  footer?: ReactNode;
  locale: Locale;
  messages: Messages;
  navigation: readonly NavigationItem[];
  reading?: boolean;
  title: string;
  utility?: ReactNode;
};

export function ShellFrame({
  children,
  context,
  feedback,
  footer,
  locale,
  messages,
  navigation,
  reading = false,
  title,
  utility,
}: ShellFrameProps) {
  return (
    <div className={`${styles.shell} ${reading ? styles.reading : ""}`} lang={locale}>
      <a className="skip-link" href="#main-content">
        {messages.skipToContent}
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href={`/${locale}`}>
          {messages.siteName}
        </Link>
        {navigation.length > 0 ? (
          <nav aria-label={messages.primaryNavigation}>
            <ul className={styles.navList}>
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    aria-current={item.current ? "page" : undefined}
                    className={styles.navLink}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {utility}
      </header>
      {context ? <div className={styles.context}>{context}</div> : null}
      <div aria-label={messages.pageFeedback} aria-live="polite" className={styles.feedback}>
        {feedback}
      </div>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </main>
      <footer className={styles.footer}>{footer ?? messages.siteName}</footer>
    </div>
  );
}

export function LocaleNavigation({ locale, messages }: { locale: Locale; messages: Messages }) {
  return (
    <nav aria-label={messages.languageLabel}>
      <ul className={styles.localeList}>
        <li>
          <Link
            aria-current={locale === "el" ? "page" : undefined}
            className={styles.localeLink}
            href="/el"
            hrefLang="el"
            lang="el"
          >
            {messages.greek}
          </Link>
        </li>
        <li>
          <Link
            aria-current={locale === "en" ? "page" : undefined}
            className={styles.localeLink}
            href="/en"
            hrefLang="en"
            lang="en"
          >
            {messages.english}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function PreviewBanner({ children }: { children: ReactNode }) {
  return (
    <div className={styles.previewBanner} role="status">
      {children}
    </div>
  );
}