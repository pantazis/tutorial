import Link from "next/link";
import type { ReactNode } from "react";

import { getMessages, languageToLocale, type Locale, type Messages } from "@/i18n";
import type { AuthenticatedContext, Language } from "@/server/auth/types";

import {
  LocaleNavigation,
  PreviewBanner,
  ShellFrame,
  type NavigationItem,
} from "./ShellFrame";

type BaseShellProps = {
  children: ReactNode;
  feedback?: ReactNode;
  title: string;
};

type AdministrativeContext = AuthenticatedContext & { role: "admin" | "master_admin" };

function requireAdministrativeContext(context: AuthenticatedContext): AdministrativeContext {
  if (context.role !== "admin" && context.role !== "master_admin") {
    throw new Error("Administrative shell requires an authorized server context.");
  }

  return context as AdministrativeContext;
}

function learnerNavigation(locale: Locale, messages: Messages, currentPath?: string) {
  const items: NavigationItem[] = [
    { href: `/${locale}/courses`, label: messages.myCourse },
    { href: `/${locale}/progress`, label: messages.myProgress },
    { href: `/${locale}/notifications`, label: messages.notifications },
    { href: `/${locale}/profile`, label: messages.myProfile },
    { href: `/${locale}/help`, label: messages.help },
    { href: `/${locale}/logout`, label: messages.logout },
  ];
  return items.map((item) => ({ ...item, current: item.href === currentPath }));
}

function adminNavigation(context: AuthenticatedContext, messages: Messages, currentPath?: string) {
  const items: NavigationItem[] = [
    { href: "/admin/courses", label: messages.courses },
    { href: "/admin/learners", label: messages.learners },
    { href: "/admin/reports", label: messages.progressActivity },
    ...(context.role === "master_admin"
      ? [{ href: "/admin/administrators", label: messages.administratorManagement }]
      : []),
    { href: `/${languageToLocale(context.language)}/courses`, label: messages.myCourse },
  ];
  return items.map((item) => ({ ...item, current: item.href === currentPath }));
}

export function PublicShell({ locale, ...props }: BaseShellProps & { locale: Locale }) {
  const messages = getMessages(locale);

  return (
    <ShellFrame
      {...props}
      locale={locale}
      messages={messages}
      navigation={[{ href: `/${locale}`, label: messages.publicHome, current: true }]}
      utility={<LocaleNavigation locale={locale} messages={messages} />}
    />
  );
}

export function AuthShell({ locale, ...props }: BaseShellProps & { locale: Locale }) {
  const messages = getMessages(locale);

  return (
    <ShellFrame
      {...props}
      locale={locale}
      messages={messages}
      navigation={[{ href: `/${locale}`, label: messages.backToPublic }]}
      reading
      utility={<LocaleNavigation locale={locale} messages={messages} />}
    />
  );
}

export function LearnerShell({
  context,
  currentPath,
  ...props
}: Omit<BaseShellProps, "locale"> & { context: AuthenticatedContext; currentPath?: string }) {
  const locale = languageToLocale(context.language);
  const messages = getMessages(locale);

  return (
    <ShellFrame
      {...props}
      locale={locale}
      messages={messages}
      navigation={learnerNavigation(locale, messages, currentPath)}
      utility={<LocaleNavigation locale={locale} messages={messages} />}
    />
  );
}

export function CourseShell({
  courseLanguage,
  courseHref,
  courseTitle,
  currentPath,
  ...props
}: Omit<BaseShellProps, "locale"> & {
  courseLanguage: Language;
  courseHref: string;
  courseTitle: string;
  currentPath?: string;
}) {
  const locale = languageToLocale(courseLanguage);
  const messages = getMessages(locale);

  return (
    <ShellFrame
      {...props}
      context={
        <Link href={courseHref}>
          {messages.backToCourse}: {courseTitle}
        </Link>
      }
      locale={locale}
      messages={messages}
      navigation={learnerNavigation(locale, messages, currentPath)}
    />
  );
}

export function AdminShell({
  context,
  currentPath,
  ...props
}: Omit<BaseShellProps, "locale"> & {
  context: AuthenticatedContext;
  currentPath?: string;
}) {
  const administrativeContext = requireAdministrativeContext(context);
  const messages = getMessages("en");

  return (
    <ShellFrame
      {...props}
      locale="en"
      messages={messages}
      navigation={adminNavigation(administrativeContext, messages, currentPath)}
    />
  );
}

export function PreviewShell({
  context,
  courseHref,
  ...props
}: Omit<BaseShellProps, "locale"> & {
  context: AuthenticatedContext;
  courseHref: string;
}) {
  const administrativeContext = requireAdministrativeContext(context);
  const messages = getMessages("en");

  return (
    <ShellFrame
      {...props}
      context={<Link href={courseHref}>{messages.backToCourse}</Link>}
      locale="en"
      messages={messages}
      navigation={adminNavigation(administrativeContext, messages)}
      utility={<PreviewBanner>{messages.previewNotice}</PreviewBanner>}
    />
  );
}