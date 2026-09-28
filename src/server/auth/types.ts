export const roles = ["user", "admin", "master_admin"] as const;
export const languages = ["EL", "EN"] as const;

export type Role = (typeof roles)[number];
export type Language = (typeof languages)[number];

export type AuthenticatedContext = {
  accountId: string;
  email: string;
  language: Language;
  role: Role;
  sessionId: string;
};

export type ServiceResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "validation" | "unauthenticated" | "denied" | "conflict" | "invalid_token" | "transient";
      message: string;
    };
