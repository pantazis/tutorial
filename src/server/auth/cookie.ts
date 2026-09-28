export const SESSION_COOKIE_NAME = "fm_session";

export type SessionCookie = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    expires: Date;
  };
};

export function createSessionCookie(token: string, expires: Date, production: boolean): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
      expires,
    },
  };
}
